import * as vscode from 'vscode';
import * as path from 'path';
import { parser } from '@lezer/python';
import { EngineIpcClient } from '../ipcClient';

export class WPipeCodeLensProvider implements vscode.CodeLensProvider {
    private cachedIsPro: boolean = false;
    private lastLicenseCheck: number = 0;

    constructor(private ipcClient?: EngineIpcClient) {}

    private async isLicenseActive(): Promise<boolean> {
        const now = Date.now();
        if (now - this.lastLicenseCheck < 5000) {
            return this.cachedIsPro;
        }
        try {
            if (this.ipcClient) {
                const status = await this.ipcClient.getLicenseStatus();
                this.cachedIsPro = Boolean(status && (status.is_pro || status.tier !== 'free'));
            } else {
                this.cachedIsPro = false;
            }
        } catch {
            this.cachedIsPro = false;
        }
        this.lastLicenseCheck = now;
        return this.cachedIsPro;
    }

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const lenses: vscode.CodeLens[] = [];
        const content = document.getText();
        const isPro = await this.isLicenseActive();
        
        try {
            const tree = parser.parse(content);
            tree.iterate({
                enter: (node) => {
                    if (node.name === 'Decorator') {
                        const decText = content.substring(node.from, node.to);
                        if (decText.startsWith('@step')) {
                            const range = new vscode.Range(
                                document.positionAt(node.from),
                                document.positionAt(node.to)
                            );

                            // Command to Run the Step
                            lenses.push(new vscode.CodeLens(range, {
                                title: "$(play) Run Step",
                                command: "wpipeSteps.runStepFromCode",
                                arguments: [document.fileName, range.start.line]
                            }));

                            // Command to Preview DAG directly from Step
                            lenses.push(new vscode.CodeLens(range, {
                                title: "$(graph) Preview DAG",
                                command: "wpipe-vscode.previewDAG",
                                arguments: [document.uri]
                            }));

                            // If license is active, allow opening Visual Canvas
                            if (isPro) {
                                lenses.push(new vscode.CodeLens(range, {
                                    title: "$(circuit-board) Open Canvas",
                                    command: "wpipe.openCanvas",
                                    arguments: [document.uri]
                                }));
                            }
                        }
                    } else if (node.name === 'CallExpression') {
                        const callText = content.substring(node.from, node.to);
                        
                        // Pipeline execution & definition
                        if (callText.includes('Pipeline(') || callText.includes('PipelineAsync(') || callText.includes('.run(')) {
                            const range = new vscode.Range(
                                document.positionAt(node.from),
                                document.positionAt(node.to)
                            );
                            lenses.push(new vscode.CodeLens(range, {
                                title: "$(play) Run Pipeline",
                                command: "wpipe-vscode.runPipeline",
                                arguments: [document.fileName]
                            }));

                            // Command to Preview DAG
                            lenses.push(new vscode.CodeLens(range, {
                                title: "$(graph) Preview DAG",
                                command: "wpipe-vscode.previewDAG",
                                arguments: [document.uri]
                            }));

                            // If license is active, allow opening Visual Canvas
                            if (isPro) {
                                lenses.push(new vscode.CodeLens(range, {
                                    title: "$(circuit-board) Open Canvas",
                                    command: "wpipe.openCanvas",
                                    arguments: [document.uri]
                                }));
                            }

                            // Detect tracking_db to offer "Open Dashboard"
                            const dbMatch = callText.match(/tracking_db\s*=\s*['"](.*?)['"]/);
                            if (dbMatch) {
                                const relativeDbPath = dbMatch[1];
                                // Attempt to resolve absolute path if it's relative
                                let absoluteDbPath = relativeDbPath;
                                if (!path.isAbsolute(relativeDbPath)) {
                                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                                    if (workspaceFolder) {
                                        absoluteDbPath = path.join(workspaceFolder.uri.fsPath, relativeDbPath);
                                    }
                                }

                                lenses.push(new vscode.CodeLens(range, {
                                    title: "$(dashboard) Open Dashboard",
                                    command: "wpipe-vscode.openDashboard",
                                    arguments: [absoluteDbPath]
                                }));
                            }
                        }

                        // set_steps assistance - Narrowed to specifically .set_steps
                        if (callText.includes('.set_steps(')) {
                            const range = new vscode.Range(
                                document.positionAt(node.from),
                                document.positionAt(node.to)
                            );
                            lenses.push(new vscode.CodeLens(range, {
                                title: "$(plus) Add Logic Block",
                                command: "wpipe-vscode.addLogicBlock",
                                arguments: [range]
                            }));

                            // Command to Preview DAG from set_steps
                            lenses.push(new vscode.CodeLens(range, {
                                title: "$(graph) Preview DAG",
                                command: "wpipe-vscode.previewDAG",
                                arguments: [document.uri]
                            }));

                            // If license is active, allow opening Visual Canvas
                            if (isPro) {
                                lenses.push(new vscode.CodeLens(range, {
                                    title: "$(circuit-board) Open Canvas",
                                    command: "wpipe.openCanvas",
                                    arguments: [document.uri]
                                }));
                            }
                        }
                    }
                }
            });
        } catch (e) {}

        return lenses;
    }
}
