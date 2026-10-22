# iOS from Ubuntu: EdumentX and xtool

Updated on **22 October 2026**. This page records the setup performed on this machine and the steps that still need your Apple account or hardware. For the complete release procedure, use the [production release guide](./PRODUCTION_RELEASE_GUIDE.md).

The approved native client is now at `~/Projects/EdumentX-iOS`. Its unsigned SwiftUI app builds on Ubuntu using xtool 1.22.2, Swift 6.4.1 and the SDK extracted from `~/Downloads/Xcode_27.1.xip`. Live integrations, full feature parity, signing and device/store checks remain pending. The existing React Native iOS target is retained until the approved migration gates pass; the older learning lab below is separate.

## Choose the build route

EdumentX is an **Expo SDK 54 / React Native 0.81** app with native Firebase, Google Sign-In, maps and CocoaPods dependencies. Its Android and iOS apps share TypeScript source. An Android APK cannot be converted into a working iOS IPA.

| Goal | Route from Ubuntu | Where compilation happens |
|---|---|---|
| Test an Android APK | Android SDK + Gradle, or EAS preview build | Ubuntu or EAS |
| Publish Android | Production EAS AAB, then Google Play testing tracks | Ubuntu or EAS |
| Build the approved native SwiftUI client | xtool + Swift + extracted Apple SDK; unsigned trial verified | Ubuntu |
| Build the retained React Native iOS target | EAS iOS build, then TestFlight/App Store Connect | Remote macOS builder |
| Learn SwiftUI with a separate Swift package | xtool + Swift + extracted Apple SDK | Ubuntu |
| Use the iOS Simulator or debug the native Xcode workspace | A Mac with Xcode | macOS |

**xtool 1.22.2 cannot build this React Native/CocoaPods project.** Its build command expects a SwiftPM app. The maintainers distinguish signing an existing artifact from compiling a React Native project; support remains an open request. Adding a `Package.swift` to this repository would not migrate React Native, Hermes or its native dependencies. See [the compatibility discussion](https://github.com/xtool-org/xtool/issues/28) and [the released build implementation](https://github.com/xtool-org/xtool/blob/1.22.2/Sources/XToolSupport/DevCommand.swift).

The tutorial you linked is useful for the separate Swift lab below: [first iOS app with xtool](https://xtool.sh/tutorials/xtool/first-app/). Its [versioned source](https://github.com/xtool-org/xtool/blob/1.22.2/Documentation/xtool.docc/First-app.tutorial) is readable when the website requires JavaScript.

## What is installed on this Ubuntu machine

| Item | Verified state |
|---|---|
| Host | Ubuntu 26.04.1 LTS, x86_64 |
| xtool | 1.22.2; downloaded from the official GitHub release, SHA-256 checked |
| Swiftly | 1.2.0; official download signature verified in an isolated keyring |
| Swift | 6.4.1; toolchain signature verified by Swiftly; selected as default |
| Compiler check | A small Foundation program compiled and ran successfully on Linux |
| Shell setup | `~/.local/bin` and Swiftly available in Bash; Swiftly source added to `.profile` and `.bashrc` |
| USB transport | `usbmuxd` 1.1.1-7 already installed; `ideviceinfo` absent |
| Apple cross-compilation SDK | Installed from the owner's Xcode 27.1 archive; `swift sdk list` includes `darwin` |
| Apple authentication/signing | **Not configured**; no Apple credentials entered |
| SwiftUI learning lab | Created outside EdumentX; not installed on a phone |
| Native EdumentX Swift trial | Unsigned ARM64 app built at `~/Projects/EdumentX-iOS/xtool/EdumentXApp.app`; minimum iOS 17; device behavior unverified |
| EdumentX signing/upload | Not started |

No apt packages were installed. Swiftly generated a suggested dependency script containing `binutils-gold`, `gnupg2` and `libz3-dev`; it was not executed because this session cannot authenticate sudo. The tested Linux compiler worked without that step. Recheck dependencies if a later build reports a missing linker/library; successful Linux compilation does not prove Apple SDK compatibility on this host.

Files created for the tools:

```text
~/.local/bin/xtool
~/.local/share/xtool/1.22.2/
~/.local/share/swiftly/
~/.cache/edumentx-toolchain/
~/Projects/xtool-lab/EdumentXSwiftSmoke/
~/Projects/xtool-lab/LinuxSmoke.swift
~/Projects/xtool-lab/linux-smoke
```

Pre-edit shell files were backed up under `~/.local/share/edumentx/toolchain-backups/20261021T034632Z/`. Do not restore them wholesale after making newer shell changes; compare and remove only the setup lines if needed.

Verify the existing installation first:

```bash
. "$HOME/.local/share/swiftly/env.sh"
hash -r
command -v xtool swift swiftly
xtool --version
swiftly --version
swift --version
swiftly list
xtool sdk status
swift sdk list
```

Expected now: xtool `1.22.2`, Swift `6.4.1`, SDK status `Darwin SDK is installed`, and `darwin` in `swift sdk list`. A new Bash terminal also loads the toolchain. No reinstall is needed on this host.

## Reproduce the host installation on another Ubuntu machine

Skip this section on the configured machine. These examples pin the tested release; review newer release notes before changing the version. Keep the tools on the Linux home filesystem rather than the project's NTFS volume.

### 1. Install xtool without FUSE or root

The AppImage was extracted so it does not depend on a working FUSE mount. The official [release 1.22.2](https://github.com/xtool-org/xtool/releases/tag/1.22.2) supplied this x86_64 artifact and checksum. Stop if verification fails; do not substitute an unverified mirror.

```bash
test "$(uname -m)" = x86_64 || exit 1
mkdir -p "$HOME/.cache/edumentx-toolchain" "$HOME/.local/bin"
mkdir -p "$HOME/.local/share/xtool/1.22.2"
cd "$HOME/.local/share/xtool/1.22.2"
curl --fail --location --retry 3 \
  https://github.com/xtool-org/xtool/releases/download/1.22.2/xtool-x86_64.AppImage \
  --output xtool.AppImage
printf '%s  %s\n' \
  e3176cdf861f58b7f135c755c7bfaec92d0568ef826027b4e5e3d82b3219ddfe \
  xtool.AppImage | sha256sum --check - || exit 1
chmod 755 xtool.AppImage
./xtool.AppImage --appimage-extract
cat > "$HOME/.local/bin/xtool" <<'SH'
#!/bin/sh
exec "$HOME/.local/share/xtool/1.22.2/squashfs-root/AppRun" "$@"
SH
chmod 755 "$HOME/.local/bin/xtool"
export PATH="$HOME/.local/bin:$PATH"
xtool --version
xtool --help
```

For ARM64 use its official release artifact and matching published checksum instead. This exact checksum applies only to the x86_64 file above.

### 2. Install Swiftly and Swift

Use the [official Swift Linux installation page](https://www.swift.org/install/linux/) for distro-specific requirements. The commands below download the official manager, verify its detached signature, then install the Swift line required by the pinned xtool documentation. They do not download Apple's SDK.

```bash
tool_cache="$HOME/.cache/edumentx-toolchain/swiftly"
mkdir -p "$tool_cache/gnupg"
chmod 700 "$tool_cache/gnupg"
cd "$tool_cache"
curl --fail --location --output swiftly.tar.gz \
  https://download.swift.org/swiftly/linux/swiftly-x86_64.tar.gz
curl --fail --location --output swiftly.tar.gz.sig \
  https://download.swift.org/swiftly/linux/swiftly-x86_64.tar.gz.sig
curl --fail --location --output all-keys.asc \
  https://www.swift.org/keys/all-keys.asc
gpg --homedir "$tool_cache/gnupg" --import all-keys.asc
gpg --homedir "$tool_cache/gnupg" --verify swiftly.tar.gz.sig swiftly.tar.gz || exit 1
tar -xzf swiftly.tar.gz
./swiftly init --skip-install --assume-yes --quiet-shell-followup
. "$HOME/.local/share/swiftly/env.sh"
touch "$tool_cache/swift-post-install.sh" "$tool_cache/swift-progress.jsonl"
swiftly install 6.4 --use --assume-yes \
  --post-install-file "$tool_cache/swift-post-install.sh" \
  --progress-file "$tool_cache/swift-progress.jsonl"
swiftly link 6.4 --assume-yes
hash -r
swift --version
```

The manager selected **6.4.1** during this setup. The verified manager signature used Swift Automatic Signing Key #4, fingerprint `E813 C892 820A 6FA1 3755 B268 F167 DF1A CF9C E069`. A fresh isolated keyring can show an owner-trust warning even after a good signature. The key file above comes from Swift's official HTTPS site; do not bypass a bad signature.

Inspect the generated `swift-post-install.sh` before using it. Apt package names can differ between Ubuntu releases. If packages are needed, run their reviewed installation command yourself with sudo. This setup deliberately did not pipe a downloaded script into a root shell.

Swiftly edits a login-shell profile. For an existing non-login terminal, source `env.sh` as above. To load both tools from future interactive Bash terminals on a fresh machine, add once to `~/.bashrc`. The configured host already has these PATH settings:

```bash
case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:$PATH" ;;
esac
if [ -f "$HOME/.local/share/swiftly/env.sh" ]; then
    . "$HOME/.local/share/swiftly/env.sh"
fi
```

### 3. Verify Linux Swift independently

This checks the host compiler and Foundation library. It does not build an iOS application.

```bash
mkdir -p "$HOME/Projects/xtool-lab"
cd "$HOME/Projects/xtool-lab"
cat > LinuxSmoke.swift <<'SWIFT'
import Foundation
let result = [1, 2, 3].reduce(0, +)
precondition(result == 6)
print("Swift Foundation Linux smoke passed: \(result)")
SWIFT
swiftc LinuxSmoke.swift -o linux-smoke
./linux-smoke
```

This exact check passed on the configured machine.

## Reproduce the Apple SDK setup

This setup is complete on the current host. The pinned xtool [Linux installation instructions](https://github.com/xtool-org/xtool/blob/1.22.2/Documentation/xtool.docc/Installation-Linux.md) pair Swift 6.4 with an **Xcode 27** archive; the actual trial here used Xcode 27.1 successfully. These steps are for another host or a deliberate reinstall, separate from the retained React Native target's EAS macOS image.

1. Open [Apple Developer downloads](https://developer.apple.com/download/all/?q=Xcode) in your own browser.
2. Sign in privately, accept the applicable Apple terms, and download the matching Xcode `.xip`. Keep it outside Git. Do not obtain Apple SDK archives from unofficial mirrors.
3. Check disk space for the downloaded archive, extraction temporary files, SDK and compiler caches. The SDK alone is about 7 GB; that is not the total setup space. This machine had about 31 GB free in home before the Swift installation, so reassess space before extraction.
4. Run the commands below with the real archive path.

```bash
df -h "$HOME" /tmp
. "$HOME/.local/share/swiftly/env.sh"
xtool sdk install "/absolute/path/to/Xcode_27.xip"
xtool sdk status
swift sdk list
```

Expected after successful extraction: an installed SDK and a `darwin` entry. `xtool sdk install --help` shows the released options, including `--slim`; check their effect before reducing SDK content. An extraction failure is not fixed by changing EdumentX's Expo SDK.

The SDK can be installed before Apple signing authentication. No Apple password, `.p8`, certificate, provisioning profile or recovery code belongs in this repository or a shared chat.

## Build the native EdumentX trial

```bash
cd "$HOME/Projects/EdumentX-iOS"
. "$HOME/.local/share/swiftly/env.sh"
python3 scripts/doctor.py
bash scripts/build-ios.sh
```

These commands passed with the installed SDK. The output is `xtool/EdumentXApp.app`, an unsigned ARM64 bundle with the PNG icon and SwiftPM logo resource. Sample tutor content is labelled. No account login, signing, phone installation or live backend operation is part of this build.

The initial compile could not find SwiftUI's `Map` and `Marker`. The app target now enables cross-import overlays with `-Xfrontend -enable-cross-import-overlays`. This matches the flag in xtool's ordinary SDK toolset, omitted from its SwiftBuild toolset in release 1.22.2; the corrected native build passes. See [upstream SDKBuilder](https://github.com/xtool-org/xtool/blob/1.22.2/Sources/XToolSupport/SDKBuilder.swift) and the native client's [verification record](https://github.com/SuhanVerse/EdumentX-iOS/blob/main/Documentation/VERIFICATION.md).

Follow the native client's [setup guide](https://github.com/SuhanVerse/EdumentX-iOS/blob/main/Documentation/SETUP.md) for owner-operated signing and physical-device checks. Firebase/Google compatibility and full app integration remain separate engineering gates. The next section is the older, smaller learning lab.

## Build the separate SwiftUI learning app

The existing scaffold is at `~/Projects/xtool-lab/EdumentXSwiftSmoke`. It is a small independent Swift app, with no EdumentX authentication, screens, database or booking logic.

For a fresh scaffold only:

```bash
mkdir -p "$HOME/Projects/xtool-lab"
cd "$HOME/Projects/xtool-lab"
xtool new EdumentXSwiftSmoke --skip-setup
```

After the Apple SDK is installed, compile without installing or signing:

```bash
cd "$HOME/Projects/xtool-lab/EdumentXSwiftSmoke"
cat Package.swift
cat xtool.yml
xtool dev build --configuration debug
```

The generated `xtool.yml` currently contains:

```yaml
version: 1
bundleID: com.example.EdumentXSwiftSmoke
```

Choose a unique lab bundle ID before signing. Do not reuse EdumentX's registered store identifier. Edit `Sources/EdumentXSwiftSmoke/ContentView.swift` to learn SwiftUI layout and state, then rebuild. Learning SwiftUI does not require rewriting the production React Native app.

### Install the lab on your own iPhone

This step contacts Apple Developer Services and can register a device, App ID, certificate and provisioning profile. Run it when you intend those account changes. It has not been run during this setup.

Check USB support first. The optional utilities need your local sudo password, entered only in your terminal:

```bash
usbmuxd --help
# Optional diagnostic utilities; usbmuxd is already installed on this machine.
sudo apt-get update
sudo apt-get install libimobiledevice-utils
idevice_id -l
idevicepair pair
ideviceinfo
```

Unlock and connect the phone with a data cable. Accept its **Trust This Computer** prompt. Follow Apple's [Developer Mode instructions](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device) when requested.

Authenticate interactively:

```bash
xtool auth login
```

For a paid team, xtool recommends an App Store Connect **Team Key** with the **App Manager** role. Its password mode also supports free-account development but uses private Apple APIs; review that choice before entering credentials. Use the interactive prompt rather than password command-line flags or shell-history entries. A free development account is not App Store distribution membership.

Then install the lab:

```bash
cd "$HOME/Projects/xtool-lab/EdumentXSwiftSmoke"
xtool dev
```

Trust the developer under iPhone Settings if prompted. A generated IPA or a working development installation does not establish App Store eligibility. Do not copy distribution-signing options from unreleased pull requests into a release script; distribution support was still being developed in [PR #326](https://github.com/xtool-org/xtool/pull/326) at this audit.

## Retained React Native iOS build route

The existing React Native target stays available while the separate Swift app passes its migration gates. Its build workflow uses the existing EAS project and a remote Mac. **Neither the local Swift toolchain nor the xtool SDK is required for this legacy path.** See [Expo's build infrastructure](https://docs.expo.dev/build-reference/infrastructure/) and [iOS production builds](https://docs.expo.dev/build-reference/ios-builds/).

Before building, complete the [release configuration and signing steps](./PRODUCTION_RELEASE_GUIDE.md) and [readiness gates](./PRODUCTION_READINESS.md). In particular, the checked-in Firebase files still name `edumentx-dev`; the production EAS environment label does not replace them. `app.config.js` supports `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST` file paths and requires mocks explicitly off for production.

These are owner-operated commands once the production environment is configured. EAS cloud builds consume plan resources; check the [current allowance](https://expo.dev/pricing) before starting a job.

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
npx --yes eas-cli@25.3.0 whoami
npm run release:doctor
# Continue only after its failures and the readiness gates are resolved.
npx --yes eas-cli@25.3.0 build --platform ios --profile production
```

The doctor checks local environment variables and selected configuration files; it does not fetch remote EAS secrets or certify security. It currently fails when production values are absent or the development Firebase files remain selected. The guide explains supplying the matching environment locally and to EAS.

Record the resulting **iOS build ID**. After checking its signed artifact and testing requirements, submit that exact build to TestFlight:

```bash
npx --yes eas-cli@25.3.0 build:view YOUR_IOS_BUILD_ID
npx --yes eas-cli@25.3.0 submit --platform ios --profile production --id YOUR_IOS_BUILD_ID
```

TestFlight processing, tester availability and App Review are separate states. An accepted upload does not publish the app. Follow the production guide through tester checks, store metadata, privacy disclosures, review and phased release. Ubuntu cannot run `xcodebuild`, the Apple iOS Simulator or CocoaPods' complete native iOS compilation pipeline locally. Installing CocoaPods alone does not change that. See [EAS local-build limitations](https://docs.expo.dev/build-reference/local-builds/).

## Troubleshooting

| Symptom | Check |
|---|---|
| `xtool: command not found` | Confirm `~/.local/bin/xtool` exists and `~/.local/bin` is on PATH; open a new terminal |
| AppImage FUSE error | Use the extracted `AppRun` wrapper above rather than launching the AppImage directly |
| `swift: command not found` | Source Swiftly `env.sh`, run `hash -r`, and inspect `swiftly list` |
| Swiftly progress-file error | Create the progress and post-install files before passing those paths |
| Host linker/library error | Inspect Swiftly's dependency suggestion and official distro requirements; do not install random older `.deb` files |
| SDK status says `Not installed` | Download your licensed Xcode archive and run `xtool sdk install`; the Linux compiler is a separate installation |
| No `Package.swift` / cannot build CocoaPods | Run xtool in the separate lab; use EAS/macOS for EdumentX |
| Phone absent | Unlock, trust and pair it; check data cable, `usbmuxd` and `idevice_id -l` |
| App installs but does not launch | Read the signing error; check Developer Mode and developer trust on the phone |
| Need TestFlight/App Store | Use EdumentX's distribution-signed EAS build and Apple membership; a lab development IPA is insufficient |
| EAS production fails on mocks | Keep `EXPO_PUBLIC_USE_MOCK_DATA=false`; resolve the environment rather than weakening the guard |

To undo the host setup, remove the xtool wrapper and its versioned directory after checking their paths, use Swiftly's supported toolchain uninstall command (`swiftly uninstall --help`), and remove only the Swiftly source lines added to your shell files. Keep Apple key revocation and registered-device cleanup in your own Apple account workflow. This project has no runtime dependency on these host tools.
