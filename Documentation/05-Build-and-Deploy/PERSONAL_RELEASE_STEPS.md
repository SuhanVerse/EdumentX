# Your next steps: iPhone 15 Plus and a free Apple account

**Next: sign in to Apple privately, then connect your iPhone to Ubuntu.** The SDK is installed and the unsigned Swift app builds. You do not need to download Xcode again.

The trial uses `com.suhanverse.edumentx.ios.trial`. This is a development identifier, not the final production identity. The current app shows labelled samples; live sign-in, database integration and the full iOS feature port remain engineering work.

## 1. Prepare pairing and sign in

On this Ubuntu machine, `usbmuxd` is installed. The pairing utilities still need installation. Run in your own terminal:

```bash
sudo apt-get install libimobiledevice-utils
cd "$HOME/Projects/EdumentX-iOS"
xtool auth login --mode password
```

Enter your Ubuntu password for `sudo`, then your Apple account credentials and 2FA only in the interactive prompts. Choose your personal team if asked. Free-account password mode uses private Apple APIs, as described in [xtool's instructions](https://github.com/xtool-org/xtool/blob/1.22.2/Documentation/xtool.docc/Installation-Linux.md). Keep credentials out of chat, command arguments and Git.

## 2. Connect and trust the phone

1. Connect the unlocked iPhone 15 Plus with a USB data cable.
2. Tap **Trust This Computer** and enter the phone passcode on the phone.
3. Pair it from Ubuntu:

```bash
idevicepair pair
idevice_id -l
```

Enable **Settings → Privacy & Security → Developer Mode** and restart if prompted. If the option is absent, tell the agent; its availability can depend on the development connection/setup. See [Apple's instructions](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device).

Reply: **“Apple login complete; iPhone connected and trusted”**, with your iOS version. You do not need to send the device ID or credentials. The agent can then attempt `xtool dev`, which contacts Apple to create development signing resources and install the trial. You handle phone/2FA prompts; the agent handles builds, logs, repeatable tests and fixes.

## 3. Know the free-account limits

Apple's personal-team provisioning expires after **seven days**, so development apps need reprovisioning/reinstallation. App Store and TestFlight distribution require Apple Developer Program membership. See [Apple's account limits](https://developer.apple.com/help/account/basics/about-your-developer-account). No membership purchase is needed for this initial device trial.

## Later, before production

Choose the final app identifiers/team, production backend projects, public support/privacy URLs, intended ages, deletion/retention and reporting policies, and whether launch is free. The agent implements those decisions. Review tested store materials before submission; the selected xtool version's App Store distribution route is still unverified.

## Repositories and details

- [EdumentX-Android](https://github.com/SuhanVerse/EdumentX-Android): Android client and shared backend. Local folder: `/media/xlegion/Win/PROJECTS/EdumentX`.
- [EdumentX-iOS](https://github.com/SuhanVerse/EdumentX-iOS): native Swift client. Local folder: `~/Projects/EdumentX-iOS`.
- [iOS setup](https://github.com/SuhanVerse/EdumentX-iOS/blob/main/Documentation/SETUP.md) · [Release readiness](PRODUCTION_READINESS.md).
