const { expo } = require("./app.json");
module.exports = {
  ...expo,
  web: { ...expo.web, output: "single" },
  ...(process.env.VITAL_WEB_BASE_PATH
    ? {
        experiments: {
          ...expo.experiments,
          baseUrl: process.env.VITAL_WEB_BASE_PATH,
        },
      }
    : {}),
};
