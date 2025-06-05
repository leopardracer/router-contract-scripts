import inquirer from "inquirer";

export async function askShowPrivate(): Promise<boolean> {
  const { showPrivate } = await inquirer.prompt([
    {
      type: "confirm",
      name: "showPrivate",
      message: "Do you want to show private key?",
      default: false,
    },
  ]);
  return showPrivate;
}
