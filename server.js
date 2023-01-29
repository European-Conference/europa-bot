const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require("request");
const path = require("path");
const Jimp = require("jimp");
const git = require("simple-git");
const fs = require("fs-extra");
const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const config = require("./config.json");

// Octokit.js
// https://github.com/octokit/core.js#readme
const octokit = new Octokit({ auth: config.OCTOKIT_TOKEN });

const { WebClient, LogLevel } = require("@slack/web-api");

const slack = new WebClient(config.SLACK_TOKEN, {
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get ('/', (req, res) => {
	console.log("/");
	res.status(200).send("Hi, this is Europa Bot. How are you?");
});

let extract_prop = (text, prop) => {
    let matching_props = text.split("\n").filter((line) => line.startsWith(prop + ":")).map((line) => {
        return line.replace(prop + ":", '').trim();
    });

    if (matching_props.length === 0) {
        throw new Error(`Could not extract the required property ${prop} from your message. I was looking for a line like '${prop}: <some_${prop}>', but could not find such a line in your messsage.`)
    }

    if (matching_props.length > 1) {
        throw new Error(`Found ${matching_props.length} ${prop} properties in your message, but I was expecting to find exactly one. There must be multiple lines that look like '${prop}: <some_${prop}>' in your message.`);
    }

    return matching_props[0];
}

let extract_body = (text) => {
    return text.split("\n").filter((line) => !/^[a-zA-Z_]+:/.test(line)).join("\n").trim();
}

let extract_image_url = (event) => {
    if (!event.files || event.files.length == 0) {
        throw new Error(`There is no image attached to your message.`);
    }

    if (event.files.length > 1) {
        throw new Error(`There is more than one image attached to your message.`);
    }

    return event.files[0].url_private_download;
}

async function get_file(url, filePath) {
    console.log("Downloading image " + url)
    return new Promise((resolve, reject) => {
      request({headers: {'Authorization': `Bearer ${config.SLACK_TOKEN}`}, url})
        .pipe(fs.createWriteStream(filePath))
        .on("finish", () => resolve())
        .on("error", err => reject(err));
    });
  }

async function process_image(url) {
    // Generate a random file name
    const fileName = `${Math.random().toString(36).substring(2, 15)}${path.extname(url)}`;
    const filePath = path.join(__dirname, "./tmp", fileName);
  
    await get_file(url, filePath);


    console.log("Reading image...");
    let image = await Jimp.read(filePath);
    const aspectRatio = image.bitmap.width / image.bitmap.height;
    if (image.bitmap.width < 300) {
        throw new Error(`Your image is too small (only ${image.bitmap.width} wide). Only images that are at least 300 pixels wide are accepted, or they won't look good on large screens.`);
    }

    if (aspectRatio < 0.75 || aspectRatio > 1) {
        throw new Error(`Your image has an incompatible aspect ratio. The aspect ratio was ${aspectRatio}, but only aspect ratios between 0.75 and 1 are accepted, so that the images look good on the website.`);
    }

    console.log("Processing image...");

    // Resize the image and return the file path
    if (config.RESIZE_IMAGES)
        image.resize(300, Jimp.AUTO).write(filePath);

    return filePath;
  }

let extract_speaker = async (event) => {
    let text = event.text;
    return {
        id: extract_prop(text, "id"),
        name: extract_prop(text, "name"),
        role: extract_prop(text, "role"),
        image_path: await process_image(extract_image_url(event)),
        keynote: false,
        visible: true,
        description: extract_body(text)
    };
}

let slack_thread_message = async (message, thread_ts) => {
    console.log(`Slacking message to thread ${thread_ts}`);

    try {
        const result = await slack.chat.postMessage({
          token: config.SLACK_TOKEN,
          channel: config.CHANNEL_ID,
          thread_ts,
          text: message
        });
      }
      catch (error) {
        console.error(error);
      }
}

let slack_error = async (e, thread_ts) => {
    slack_thread_message(
        `Hi, human. I'm having trouble understanding your message above. The following parsing error occurred: \n\n${e}\n\nPlease fix your message and try again (post a new message, don't edit the old one).`,
        thread_ts);
};


async function create_speaker_pr(speaker) {
  // Clone the pre-defined repo into a randomly named directory
  const tmpDir = path.join("./tmp", crypto.randomBytes(8).toString("hex"));
  
  console.log("Cloning repo and checking out branch...");
  await git().clone(config.WEBSITE_REPO, tmpDir);
  const gitRepo = git(tmpDir);
  await gitRepo.checkoutLocalBranch("speakers/" + speaker.id);
  try {
    await gitRepo.pull("origin", "speakers/" + speaker.id);
  } catch (e) {
    console.log("Ignoring git pull errror: " + e.message);
  }

  console.log("Making changes...");
  // Create the content/speakers/{speaker.id} directory if it doesn't exist
  const speakerDir = path.join(tmpDir, "content", "speakers", speaker.id);

  await fs.ensureDir(speakerDir);

  // Copy the image to content/speakers/{speaker.id}
  const imageExt = path.extname(speaker.image_path);
  const imageDest = path.join(speakerDir, `${speaker.id}${imageExt}`);
  await fs.copy(speaker.image_path, imageDest);

  // Create the index.md file with the speaker information
  const indexPath = path.join(speakerDir, "index.md");
  const indexContent = `---\nname: ${speaker.name}\nrole: ${speaker.role}\nkeynote: ${speaker.keynote}\nshow: ${speaker.visible}\n---\n\n${speaker.description}`;
  await fs.writeFile(indexPath, indexContent);

  console.log("Adding and commiting changes...");
  // Navigate to the repo directory and commit the changes
  await gitRepo.add(".");
  await gitRepo.commit("Add speaker: " + speaker.name);

  console.log("Pushing to origin...");
  // Push the new branch and open a pull request
  await gitRepo.push("origin", "speakers/" + speaker.id);

  let response = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    title: 'Update speaker ' + speaker.name,
    body: 'This PR was autogenerated by Europa Bot, on behalf of a slack user.',
    head: 'speakers/' + speaker.id,
    base: 'main'
  })

  return response.data.html_url;
}


app.post('/events', async (req, res) => {
    let event = req.body;

    console.log("Received event");

    if (event.challenge) {
        res.status(200).send({challenge: req.body.challenge});
        return;
    }

    res.status(200).send();

    event = event.event;

    if (event.type != "message") {
        throw new Error(`Unknown slack event type ${event.type}`);
    }

    if (event.bot_id || event.parent_user_id) {
        console.log(`Skipping bot message or thread response.`);
        return;
    }

    if (!event.text) {
        console.log(`Skipping message without text.`);
        return;
    }

    console.log(`Message content is ${event.text}`);

    if (event.text.includes("```")) {
        slack_error("I can't parse code blocks: your message contained\n```code blocks```\n instead of plain text.", event.ts);
        return;
    }

    try {
        var speaker = await extract_speaker(event);
    } catch (e) {
        await slack_error(e.message, event.ts);
        return;
    }

    slack_thread_message(`Hello human! Okay, I'll create a Pull Request to change (or update) speaker ${speaker.id}. Hold on, this might take a minute.`, event.ts);
    
    try {
        console.log(`Creating PR for speaker ${speaker.id}...`)
        var pr = await create_speaker_pr(speaker);
        console.log(`PR created: ${pr}`);
    } catch (e) {
        //bad
        if (/A pull request already exists for (.*)\./.test(e.message)) {
            let pr = /A pull request already exists for (.*)\./.exec(e.message)[1];
            await slack_thread_message(`It seems that a Pull Request (${pr}) already exists for this speaker. I've updated it, so you're good to go!`, event.ts);
            return;
        }

        await slack_thread_message(`Unfortunately, something went wrong while trying to create the PR. It's probably not your fault, human.`, event.ts);

        console.log("Error while creating speaker PR:");
        console.log(e);
        return;
    }


    await slack_thread_message(`Your PR has been opened (great success!): ${pr}. Now find some wise human to review it (@Christos).`, event.ts)
});

app.listen(config.PORT, () => {
	console.log('Server listening on port ' + config.PORT);
});
