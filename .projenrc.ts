import { TypeScriptComponent } from "@hallcor/pulumi-projen-project-types";
const project = new TypeScriptComponent({
  defaultReleaseBranch: "main",
  devDeps: ["@hallcor/pulumi-projen-project-types"],
  name: "PulumiSdks",
  projenrcTs: true,

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();