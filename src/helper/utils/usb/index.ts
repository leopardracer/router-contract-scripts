import * as fs from "fs-extra";
import path from "path";
import * as os from "os";

const Usb_File_Path = ".rsc/usb.json";

// List all mounted USB drives
export function listMountedUSBDrives() {
  const volumesPath = "/Volumes";
  const volumes = fs.readdirSync(volumesPath);

  const usbDrives = volumes.filter((volume) => {
    const volumePath = path.join(volumesPath, volume);

    // Ensure it's a directory and filter out system-specific volumes
    return (
      fs.lstatSync(volumePath).isDirectory() &&
      !["Macintosh HD", "Recovery", "Preboot", "VM"].includes(volume)
    );
  });

  if (usbDrives.length === 0) {
    console.log("No USB drives connected.");
  } else {
    console.log("Connected USB drives:");
    usbDrives.forEach((drive, index) => {
      console.log(`${index + 1}: ${drive}`);
    });
  }
  return usbDrives.map((drive) => path.join(volumesPath, drive));
}

export async function writeFileToUSB(
  usbDrivePath: string,
  wallet: Object,
  usbFilePath: string = Usb_File_Path
) {
  const targetPath = path.join(usbDrivePath, usbFilePath);
  const directory = path.dirname(targetPath);
  // Ensure the directory exists, create if it doesn't
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  console.log(wallet);
  await fs.writeJSON(targetPath, wallet);
  console.log(`File written to: ${targetPath}`);
}

export async function readFileOnUSB(
  usbDrivePath: string,
  usbFilePath: string = Usb_File_Path
) {
  const targetPath = path.join(usbDrivePath, usbFilePath);
  if (fs.existsSync(targetPath)) {
    return fs.readJSON(targetPath, "utf8");
  } else throw new Error("File does not exist on USB. Creating a new one.");
}
