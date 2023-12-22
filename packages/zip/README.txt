------------------------------ Crowdin CLI v3 ---------------------------------

# Installation on Linux and MacOS

Run `. install-crowdin-cli.sh` in the terminal with sudo rights in order to add `crowdin` command to your terminal

-------------------------------------------------------------------------------

# Installation on Windows

1. Open Command Prompt as an Administrator
    - Click Start
    - In the Start Search box, type `cmd`, and then press CTRL+SHIFT+ENTER
    - If the User Account Control dialog box appears, confirm that the action it displays is what you want, and then click Continue

2. Run `setup-crowdin.bat` script in order to add `crowdin` command to the Command Prompt
3. Restart your Command Prompt

-------------------------------------------------------------------------------

# Running the App

Use the following method to run the app:

- crowdin

Alternative method:

- java -jar crowdin-cli.jar

-------------------------------------------------------------------------------

# General Commands

To display help information:

- crowdin -h

To generate Crowdin CLI configuration skeleton:

- crowdin init

To analyze your configuration file for potential errors:

- crowdin lint

To show a list of source files in the current project:

- crowdin list project
