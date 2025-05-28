import * as crypto from "crypto";

// Encrypt the crypto key with a password
export const encrypt = (text: string, password: string): string => {
  const iv = crypto.randomBytes(16); // Initialization vector
  const key = crypto.scryptSync(password, "salt", 32); // Derive a key from the password
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted; // Return IV and encrypted content
};

// Decrypt the crypto key with a password
export const decrypt = (encrypted: string, password: string): any => {
  const [iv, content] = encrypted.split(":");
  const key = crypto.scryptSync(password, "salt", 32);
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(content, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
