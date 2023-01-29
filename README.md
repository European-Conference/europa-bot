# Europa Bot
A slack bot that updates the European Conference website. A node.js script, mostly built with ChatGPT.


## Usage instructions

This section is aimed at organizers of the European Conference that want to add new speakers to the website, or update existing speakers. Europa Bot lets you add speakers via slack. 

In our Slack, join #update-speakers and write a message like the following:
```
id: biden
name: Joe Biden
role: President of the United States

Joe Biden is blah blah

blah

blah
```

**Attach** (e.g. drag and drop) **an image to your message**, and send it. You’re done!


Europa Bot (@EuropeanConferenceBot on Slack) is tirelessly monitoring the channel, and should pick up your message and reply with her progress in-thread. If all goes well, she will create a Pull Request on Github (where the source code of the website is hosted) and give you a link to it. That is essentially a change request that adds the speaker in your slack message. Someone (me) needs to review and approve it, and once it’s approved it will go live on the website (euroconf.eu).

### Notes
* Europa Bot performs some basic checks on your message, and informs you if you break any of the following requirements:
  - The first three lines **are strict and required**.
  - The `id` must be the speaker’s last name in lower case letters. This must be a single word. E.g. for Joe Biden it should be biden, for Angela Merkel it should be merkel. This ID will be used in the link to the speaker’s site on the website (e.g. https://euroconf.eu/speakers/biden).
  - The `role` should be a short description of the candidate’s role. This is what will appear below their names on their speaker cards. Try to make it one or two sentences.
  - The `name` should be the full name of the speaker.
  - The image needs to be between the aspect ratios of 0.8 and 1. It also needs to be at least 300px wide. This is so that the image looks good on the website.
* Made a mistake in a speaker’s details? Just post another message with the corrected speaker info. Make sure the speaker ID is the same. Europa Bot should take care of the rest, and create a PR to update the existing speaker (or update an existing PR, if there is one).
* Optionally, you can create a github account (if you don’t already have one) and let me know of your username so I can add you to our org. Then, you’ll be able to access the Pull Requests that you’re creating through the bot yourself. Each pull request is automatically built, tested and deployed to a unique URL, where you can preview your changes if you want to. This URL is posted as a comment to the pull request. As an example, this is the profile page of an added speaker on a preview version of the website.
