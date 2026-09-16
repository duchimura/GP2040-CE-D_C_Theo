# Reverting to the Original (Stock) GP2040-CE Interface

This project replaces the GP2040-CE web configurator UI, built into a custom
firmware image. Because RP2040 boards flash firmware as simple drag-and-drop
`.uf2` files, **returning a device to the original interface just means flashing
the official stock GP2040-CE firmware** — no special mechanism is required.

## What "revert" means

Flashing the official upstream GP2040-CE `.uf2` for your board fully restores the
original interface and behavior. Your custom UI is part of the firmware image, so
replacing the firmware replaces the UI.

> Configuration note: settings are stored on the device. Flashing different
> firmware can reset or migrate stored settings — back up your config first
> (the configurator's Data Backup page) if you want to keep it.

## Steps

1. **Download the matching stock firmware.**
   Go to <https://github.com/OpenStickCommunity/GP2040-CE/releases> and download
   the `.uf2` that matches **your board** and the **version** you want to return
   to (use the same version family your device shipped with, if known).

2. **Enter BOOTSEL (flashing) mode** so the board mounts as a USB drive named
   `RPI-RP2`:
   - Unplug the controller.
   - Hold the board's **BOOTSEL** button (on a bare Pico) — or the
     board-specific boot combination for a commercial board — while plugging the
     USB cable back into your PC.
   - Release once `RPI-RP2` appears as a drive.

3. **Flash.** Drag the downloaded stock `.uf2` onto the `RPI-RP2` drive. The
   board reboots automatically when the copy completes.

4. **Verify.** Enter web-config as usual (hold the config button / plug in) and
   open <http://192.168.7.1> — the original interface is back.

## Board → stock `.uf2` reference

Fill this in per board you support so users grab the right file. (Filenames come
from the upstream release assets.)

| Board            | Stock `.uf2` filename (upstream release asset) |
| ---------------- | ---------------------------------------------- |
| Raspberry Pi Pico| `GP2040-CE_<version>_Pico.uf2`                  |
| _(add boards)_   | _(add filenames)_                              |
