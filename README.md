# GCF monorepo

Example repository to demonstrate how to work with Google Cloud function with monorepo.

# 🏃‍♂️ Getting started

1. Install dependencies: `yarn install`

# Local development

To run local function, you need to use `dev` script, for example:

```sh
yarn workspace @productbrew/funny-world dev
```

Then visit `http://localhost:8080/` to see the function response.

# Deployment

Run `gcloud functions deploy` This command will prepare the functions and deploy them.

```sh
yarn cli prepare-deploy funny-world
```

> Remember to remove the changes after deployment!
