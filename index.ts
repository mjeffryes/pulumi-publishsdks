import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as fs from "fs/promises";

export interface PulumiSdksArgs {
  pluginBinary: string;
  workingDir?: string; // must be absolute path for now
  public: boolean; // if true, publish to the registries as a public package
}

export class PulumiSdks extends pulumi.ComponentResource {
  public readonly npmOutput: pulumi.Output<string>;
  public readonly pyPiOutput: pulumi.Output<string>;

  constructor(name: string, args: PulumiSdksArgs, opts?: pulumi.ComponentResourceOptions) {
    super("pkg:index:PulumiSdks", name, {}, opts);

    const workingDir = args.workingDir ?? pulumi.output(fs.mkdtemp("/tmp/pulumi-sdk-"))

    // Generate the package when the plugin binary changes
    const generatePackage = new command.local.Command("generatePackage", {
      create: `pulumi package gen-sdk "${args.pluginBinary}"`,
      dir: workingDir,
      triggers: [new pulumi.asset.FileAsset(args.pluginBinary)], // Trigger the command when the plugin binary changes
      archivePaths: [`sdk/**`],
    }, { parent: this, });

    // When the package is generated, publish it to NPM
    const npmFlags = args.public ? "--access public" : "";
    const publishToNpm = new command.local.Command("publishToNpm", {
      create: `echo '//registry.npmjs.org/:_authToken=\${NPM_TOKEN}' > .npmrc; npm publish ${npmFlags}`,
      dir: pulumi.interpolate`${workingDir}/sdk/nodejs`,
      triggers: [generatePackage.archive], // Trigger the command when the package is generated
      environment: {
        "NPM_TOKEN": process.env.NPM_TOKEN || "", // Ensure you have your NPM token set in the environment
      },
    }, { parent: this, ignoreChanges: ["dir"], });

    // When the package is generated, publish it to PyPi
    const publishToPyPi = new command.local.Command("publishToPyPi", {
      create: "python3 -m pip install build twine && python3 -m build && python3 -m twine upload dist/* --u __token__ -p ${PYPI_TOKEN}",
      dir: pulumi.interpolate`${workingDir}/sdk/python`,
      triggers: [generatePackage.archive], // Trigger the command when the package is generated
      environment: {
        "PYPI_TOKEN": process.env.PYPI_TOKEN || "", // Ensure you have your PyPI token set in the environment
      },
    }, { parent: this, ignoreChanges: ["dir"], });


    this.npmOutput = publishToNpm.stdout;
    this.pyPiOutput = publishToPyPi.stdout;
    this.registerOutputs(undefined);
  }
}
