# Chronogram Auto-Voter

A Chrome extension that automatically votes for your favorite nominee in the [Chronogram Readers' Choice Awards](https://www.chronogram.com).

## Installation

This extension is not published to the Chrome Web Store, so you need to load it manually.

1. Clone or download this repository to your computer.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the folder containing these files (`manifest.json`, `popup.html`, `popup.js`).
5. The extension icon will appear in your Chrome toolbar. Pin it for easy access.

## Usage

1. Navigate to the Chronogram ballot page (the URL will contain `secondstreetapp.com`).
2. Click the extension icon in your toolbar to open the popup.
3. Enter your **email address** — this is used to register your vote when prompted.
4. Enter the **nominee name** you want to vote for. A partial match works (e.g. `Kingston Bread` will match any entry containing that text).
5. Click **Vote Now**.

The extension will scan every category on the ballot page, vote for your nominee wherever they appear, and report:

- Categories where your vote was successfully cast
- Categories where you had already voted today
- A warning if your nominee wasn't found on the page

Your email and nominee name are saved locally and will be pre-filled next time you open the popup.

## Notes

- You can vote **once per day per category**. Run it again tomorrow to vote again.
- The ballot page must be open and active in your current tab when you click Vote Now.
- All data (email, target name) is stored locally in your browser using `chrome.storage.local` and is never sent anywhere except the ballot page itself.
