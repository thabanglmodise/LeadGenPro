# Rules and Guidelines

- For all instructions and commit messages, be extremely concise and sacrifice grammar for the sake of concision

## Workflow rules

- Before implementing any feature create a markdown document that outlines the objective of the feature and defines its implementation in `./DOCS`.
- If the `DOCS` folder does not exist, create it at the root of this project.
- The markdown files should consist of a list of to-do at the bottom each defining the stages of the implementation
- Tick off each to-do as it gets implemented.
- ONLY WORK ON ONE STAGE OF A FEATURE AT A TIME.
- If a feature requires multiple stage be implemented in parallel, request clarification and approval before continuing.
- Ask clarifying questions when implementing large features to ensure understanding of stated retirements

## Stylesheet rule

- Syntax: use BEM when creating classnames - eg. block__element--modifier

## Standards, Styling and coding preference ruls

### Syntax

- Variable declaration:
  - Use camelCase
  - local variable declaration - prefix underscore(_) eg: **_localVar**

- Functions:
  - prefer normal functions over arrow functions
  - break down functions into reusable components - functional/reactive programming styles
  - sacrifice complexity and abstraction for the sake of readability and understanding

## Memory rules

- Use `git status` to check for changes to the source code made outside of your context window.
- Alternatively use `git log`  to view the most recent commits, and check those changed files to refresh your context window

## Git Workflow Rules

- the git cli should be your primary mode of interacting with git and github.
- never work directly on the main/master branch.
- You are only to make commits to the `more-cowbell` branch.
- You are permitted to pull from the master branch and merge that into the `more-cowbell` branch.
- For all commits create a summary to-do list in markdown format defining what has been done and what still needs to be done. This list should be informed by the feature documentation used to create that feature located in `./DOCS`
