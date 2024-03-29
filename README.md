# Europa Bot
A slack bot that updates the European Conference website. A node.js script, mostly built with ChatGPT.


## Usage instructions

This section is aimed at organizers of the European Conference that want to add new speakers to the website, or update existing speakers. Europa Bot lets you add speakers via Slack. 

In our Slack, join the #europa-bot channel and write a message like the following:
```
id: biden
name: Joe Biden
role: President of the United States
type: speaker

Joe Biden is the 46th president of the United States. He was formerly vice president in the Obama administration from 2009 to 2018. Prior to that, President Biden served as a senator...
```

**Attach** (e.g. drag and drop) **an image to your message**, and send it. You’re done!


Europa Bot (@EuropeanConferenceBot on Slack) is tirelessly monitoring the channel and should pick up your message and reply with her progress in-thread. If all goes well, she will create a Pull Request on Github (where the source code of the website is hosted) and give you a link to it. That is essentially a change request that adds the speaker/organizer in your slack message. Someone needs to review and approve it, and once it’s approved, it will go live on the website (euroconf.eu).

### Notes
* Europa Bot performs some basic checks on your message, and informs you if you break any of the following requirements:
  - The first four lines **are strict and required**.
  - The `id` must be the person’s last name in lower case letters. This must be a single word. E.g. for Joe Biden it should be biden, for Angela Merkel it should be merkel. This ID will be used in the link to the person’s site on the website (e.g. https://euroconf.eu/speakers/biden).
  - The `role` should be a short description of the candidate’s role. This is what will appear below their names on their person cards.
  - The `name` should be the full name of the person.
  - The `type` should be either "speaker" or "organizer."
  - The bio should provide a background of the person's career and work. You can read bios for speakers from last year's conference on the website if you would like to get an idea of what the bio should look like.
  - The image needs to be between the aspect ratios of 0.8 and 1. It also needs to be at least 300px wide. This is so that the image looks good on the website.
* Made a mistake in a person’s details? Just post another message with the corrected person info. Make sure the person ID is the same. Europa Bot should take care of the rest, and create a PR to update the existing person (or update an existing PR, if there is one).
* Optionally, you can create a github account (if you don’t already have one) and let me know of your username so I can add you to our org. Then, you’ll be able to access the Pull Requests that you’re creating through the bot yourself. Each pull request is automatically built, tested and deployed to a unique URL, where you can preview your changes if you want to. This URL is posted as a comment to the pull request. As an example, this is the profile page of an added person on a preview version of the website.
