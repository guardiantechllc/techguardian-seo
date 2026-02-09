# OpenCore Legacy Patcher: 2009 iMac Installation Guide

**Tech Guardian LLC — Internal Reference**

This guide covers installing a modern macOS on a 2009 iMac (iMac9,1 / iMac10,1) using OpenCore Legacy Patcher (OCLP).

---

## What You Need

- **2009 iMac** (the target machine)
- **A working Intel Mac** (e.g., 2017 MacBook Pro) to create the installer
  - **Do NOT use an M4/Apple Silicon Mac** — it cannot create bootable USB installers for older Intel macOS versions
- **16GB+ USB flash drive** (will be erased)
- **OpenCore Legacy Patcher** (download from https://dortania.github.io/OpenCore-Legacy-Patcher/)
- **Ethernet or compatible Wi-Fi** on the 2009 iMac (Wi-Fi may need post-install patching)

## 2009 iMac: What macOS Can It Run?

| Model | Max Official | Max with OCLP |
|-------|-------------|---------------|
| iMac9,1 (Early 2009) | El Capitan 10.11 | macOS Monterey 12 (recommended) |
| iMac10,1 (Late 2009) | High Sierra 10.13 | macOS Monterey 12 (recommended) |

> **Note:** Ventura (13) and newer dropped support for these models even in OCLP. Monterey 12 is the sweet spot for a 2009 iMac — stable and well-supported by OCLP.

---

## Common Mistakes to Avoid

### "El Capitan needs to be downloaded from the App Store"
This error means the installer certificate is **expired**. You do NOT need to fix this.
If your goal is to run a newer macOS via OpenCore, **skip El Capitan entirely**.
OCLP downloads the macOS installer for you.

### Creating the USB on an M4/Apple Silicon Mac
Apple Silicon Macs **cannot** create bootable Intel macOS USB installers.
Always use an **Intel Mac** (your 2017 MacBook Pro works).

### Downloading macOS manually
Don't bother hunting for macOS downloads. OCLP has a built-in downloader that grabs the correct installer directly from Apple's servers.

---

## Step-by-Step Installation

### Step 1: Prepare on Your 2017 MacBook Pro (Intel)

1. Download the latest OCLP release from:
   https://dortania.github.io/OpenCore-Legacy-Patcher/
   - Download the **GUI app** (the `.app.zip` file)
2. Unzip and open **OpenCore-Patcher.app**
3. You may need to right-click > Open to bypass Gatekeeper

### Step 2: Download macOS Through OCLP

1. In OCLP, click **"Create macOS Installer"**
2. Click **"Download macOS Installer"**
3. Select **macOS 12 Monterey** (recommended for 2009 iMac)
4. Wait for the download to complete (~12-13 GB)

> This downloads the full installer directly from Apple. No App Store needed.

### Step 3: Create the Bootable USB

1. Plug in your 16GB+ USB flash drive
2. After the download finishes, OCLP will ask to **"Flash Installer"**
   - If it doesn't, go back to "Create macOS Installer" > "Use existing macOS Installer" and select the downloaded Monterey installer
3. Select your USB drive as the target
4. **WARNING: This erases the USB drive completely**
5. Wait for the flash to complete (can be slow on USB 2.0)

### Step 4: Install OpenCore to the USB

1. Back in OCLP's main menu, click **"Build and Install OpenCore"**
2. Click **"Build OpenCore"**
3. When prompted for the model, select your iMac model:
   - **iMac9,1** (Early 2009) or **iMac10,1** (Late 2009)
   - If building on the 2017 MacBook Pro, you may need to manually set the target model in Settings
4. After building, click **"Install to disk"**
5. Select **the USB drive** (NOT your MacBook's internal drive)
6. Install to the **EFI partition** of the USB drive

### Step 5: Boot the 2009 iMac from USB

1. Plug the USB into the 2009 iMac
2. Power on and **hold the Option (⌥) key** immediately
3. You should see a boot picker — select **"EFI Boot"** or the OpenCore option
4. The OpenCore boot picker will appear — select **"Install macOS Monterey"**

### Step 6: Install macOS

1. In the macOS installer, open **Disk Utility** first
2. Select your internal hard drive (or SSD if upgraded)
3. Click **Erase**:
   - Name: `Macintosh HD` (or whatever you want)
   - Format: **APFS** (for SSD) or **Mac OS Extended (Journaled)** (for HDD)
   - Scheme: **GUID Partition Map**
4. Close Disk Utility
5. Click **"Install macOS Monterey"**
6. Select the drive you just erased
7. Wait for installation (the iMac will reboot multiple times — keep the USB plugged in)
8. Each time it reboots, it should auto-boot from OpenCore. If it doesn't, hold Option and select EFI Boot again

### Step 7: Post-Install — Install OpenCore to Internal Drive

Once macOS is set up and you're on the desktop:

1. Open OCLP **on the 2009 iMac** (download it again or copy from USB)
2. Click **"Build and Install OpenCore"**
3. Build OpenCore for your model
4. This time, install to the **internal drive** (not the USB)
5. Now the iMac can boot without the USB plugged in

### Step 8: Post-Install — Apply Root Patches

1. In OCLP, click **"Post-Install Root Patch"**
2. Click **"Start Root Patching"**
3. This fixes:
   - Graphics acceleration (critical for 2009 iMac — Nvidia GPU)
   - Wi-Fi
   - Bluetooth
   - Audio
4. Reboot when prompted

---

## Troubleshooting

### 🚫 Stop Sign (Prohibitory Symbol) When Booting USB

This is the most common issue with the 2009 iMac. It means the Mac found a system but considers it incompatible. There are **three things** to check, in order:

#### Fix 1: You're booting the wrong icon (MOST COMMON)

When you hold Option (⌥) at startup, you'll see multiple drive icons:
- ❌ **Do NOT click the orange/yellow "Install macOS" icon** — this boots the installer directly, skipping OpenCore. The hardware is unsupported, so you get the stop sign.
- ✅ **Click "EFI Boot"** — this is a small gray drive icon, usually on the far left or right. THIS loads OpenCore first, which spoofs the hardware so macOS thinks it's supported.

If you don't see "EFI Boot" at all, OpenCore was never installed to the USB. Go back to Step 4 — you created the macOS installer USB but skipped installing OpenCore to it. These are **two separate steps**.

#### Fix 2: OpenCore wasn't built for the right model

If you built OpenCore on the 2017 MacBook Pro without changing the target model, OCLP built it for the MacBook Pro — not the iMac. The config won't have the right patches.

**Before building OpenCore:**
1. Open OCLP on the 2017 MacBook Pro
2. Go to **Settings** (gear icon or menu)
3. Find **"Override Model"** or **"Target Model"**
4. Set it to **`iMac9,1`** (Early 2009) or **`iMac10,1`** (Late 2009)
5. Go back and click **"Build and Install OpenCore"**
6. Install to the USB's EFI partition

**How to find your exact model:** Look at the back of the iMac for the model number (A1225 = Early 2009 = iMac9,1, A1311/A1312 = Late 2009 = iMac10,1).

#### Fix 3: 32-bit EFI firmware (iMac9,1 Early 2009 specifically)

The Early 2009 iMac (iMac9,1) has **32-bit EFI firmware** with a 64-bit CPU. This is a notorious compatibility issue. OCLP should handle this automatically when the model is set correctly, but if it's still failing:

1. Make sure you're on the **latest version of OCLP** (2.0.0 or newer)
2. In OCLP Settings, confirm the model is set to **iMac9,1**
3. Rebuild OpenCore — OCLP will include the `DuetPkg` 32-bit EFI bootloader automatically
4. When installing to the USB, OCLP should create a **legacy boot** setup if needed

If the stop sign persists with iMac9,1:
- Try **macOS Big Sur 11** instead of Monterey — it has better 32-bit EFI compatibility
- Make sure the USB drive is formatted as **Mac OS Extended (Journaled)** with **GUID Partition Map** before creating the installer (not APFS)

#### Fix 4: Try a different macOS version

If you tried Monterey and keep hitting the stop sign:
1. Go back to OCLP on the 2017 MacBook Pro
2. Download **macOS Big Sur 11** instead (Create macOS Installer → Download)
3. Flash to USB
4. Rebuild OpenCore with the correct model override
5. Install OpenCore to the USB
6. Try booting again

Big Sur has the best compatibility with 2009 iMacs in OCLP.

---

### Black screen after install
The 2009 iMac has an Nvidia GeForce 9400M or GT 120/130. Root patches are **required** for graphics acceleration on Monterey. If you get a black screen:
- Boot into Safe Mode: hold **Shift** at the OpenCore boot picker
- Run OCLP and apply root patches
- Reboot normally

### iMac won't boot from USB
- Make sure you installed OpenCore to the USB's EFI partition (Step 4)
- Try a different USB port (use USB 2.0 ports, not any aftermarket USB 3.0)
- Reset NVRAM: hold **Command + Option + P + R** on boot

### "This copy of the Install macOS application is damaged"
- Set the date back in Terminal during the installer: `date 0601000022` (sets to June 1, 2022)
- This bypasses certificate validation on the installer

### Extremely slow performance after install
- Root patches not applied. Run Step 8.
- Without root patches, macOS runs without GPU acceleration (software rendering) which is painfully slow.

### Wi-Fi not working
- Expected. Apply root patches (Step 8).
- Use Ethernet for the initial setup and OCLP download.

---

## If You Just Want El Capitan (No OpenCore Needed)

If you don't need a newer macOS and just want El Capitan (the last officially supported version for iMac9,1):

1. Download directly from Apple (bypasses the App Store):
   https://support.apple.com/en-us/106384
2. This gives you an `InstallMacOSX.dmg` file
3. Open the DMG and run the `.pkg` installer inside it
4. The installer app will appear in /Applications
5. Use `createinstallmedia` on your Intel Mac to create a USB:
   ```
   sudo /Applications/Install\ OS\ X\ El\ Capitan.app/Contents/Resources/createinstallmedia --volume /Volumes/MyVolume
   ```
6. If you get a certificate error, set the date back:
   - Open Terminal
   - Run: `date 0901000019` (sets date to Sept 1, 2019)
   - Then run the installer

---

## Quick Reference: OCLP Settings for 2009 iMac

If OCLP doesn't auto-detect your model (because you're building on the 2017 MBP):

1. In OCLP, go to **Settings**
2. Set **Override Model** to `iMac9,1` or `iMac10,1`
3. Go back and build OpenCore

---

*Last updated: February 2026*
*Tech Guardian LLC — (816) 697-9268*
