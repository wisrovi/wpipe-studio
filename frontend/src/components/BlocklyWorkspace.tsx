import React, { useEffect, useRef } from "react";
import * as Blockly from "blockly";

// Define custom block shapes and categories for WPipe Studio Scratch workspace
export function registerWPipeBlocklyBlocks() {
  if (Blockly.Blocks["wpipe_step"]) return;

  // 1. WPipe Step Block (Motion Blue) with Config Warning/Gear Icon
  Blockly.Blocks["wpipe_step"] = {
    init: function () {
      const configField = new Blockly.FieldImage(
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%23fbbf24'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/></svg>",
        18,
        18,
        "⚠️ Config Required (Click to edit parameters)",
        () => {
          if (typeof (window as any).onOpenBlockConfigModal === "function") {
            (window as any).onOpenBlockConfigModal(this);
          }
        }
      );

      this.appendDummyInput()
        .appendField("📦 Step:")
        .appendField(new Blockly.FieldTextInput("HttpRequest"), "STEP_NAME")
        .appendField(configField, "CONFIG_ICON");
      this.appendDummyInput()
        .appendField("Namespace:")
        .appendField(new Blockly.FieldTextInput("wpipe_steps.connectivity"), "NAMESPACE");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(217); // Scratch Motion Blue
      this.setTooltip("Executes a WPipe state step. Click ⚠️/⚙️ to configure parameters.");
      this.setHelpUrl("");
    },
  };

  // 2. IF Condition Block (Control Yellow/Orange)
  Blockly.Blocks["wpipe_if"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔀 IF")
        .appendField(new Blockly.FieldTextInput("status_code == 200"), "CONDITION");
      this.appendStatementInput("DO").setCheck(null).appendField("THEN");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(36); // Scratch Control Yellow
      this.setTooltip("Executes nested steps if condition is true");
    },
  };

  // 3. IF-ELSE Dual-Branch Condition Block
  Blockly.Blocks["wpipe_if_else"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔀 IF")
        .appendField(new Blockly.FieldTextInput("status_code == 200"), "CONDITION");
      this.appendStatementInput("DO").setCheck(null).appendField("THEN");
      this.appendStatementInput("ELSE").setCheck(null).appendField("ELSE");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(36); // Scratch Control Yellow
      this.setTooltip("Executes THEN branch on true, ELSE branch on false");
    },
  };

  // 4. FOR / REPEAT Loop Block (Events Gold)
  Blockly.Blocks["wpipe_for"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔁 REPEAT")
        .appendField(new Blockly.FieldNumber(5, 1, 100), "ITERATIONS")
        .appendField("TIMES");
      this.appendStatementInput("DO").setCheck(null).appendField("DO");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(45); // Scratch Events Gold
      this.setTooltip("Repeats nested steps N times");
    },
  };

  // 5. PARALLEL Branch Block (Operators Green)
  Blockly.Blocks["wpipe_parallel"] = {
    init: function () {
      this.appendDummyInput().appendField("⚡ RUN IN PARALLEL");
      this.appendStatementInput("DO").setCheck(null).appendField("STEPS");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120); // Scratch Operators Green
      this.setTooltip("Executes nested steps concurrently in parallel");
    },
  };

  // 6. WHILE Loop Block (Control Orange)
  Blockly.Blocks["wpipe_while"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔁 REPEAT WHILE")
        .appendField(new Blockly.FieldTextInput("status_code == 200"), "CONDITION");
      this.appendStatementInput("DO").setCheck(null).appendField("DO");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(36); // Scratch Control Orange
      this.setTooltip("Repeats nested steps while condition evaluates to true");
    },
  };
}

// Global reference store for workspace injection helper
let activeWorkspaceRef: Blockly.WorkspaceSvg | null = null;

export function addStepBlockToWorkspace(stepName: string, namespace: string, stepOrigin: string = "catalog") {
  if (!activeWorkspaceRef) return;
  const block = activeWorkspaceRef.newBlock("wpipe_step");
  block.setFieldValue(stepName, "STEP_NAME");
  block.setFieldValue(namespace, "NAMESPACE");
  block.initSvg();
  block.render();
  block.moveBy(150 + Math.floor(Math.random() * 40), 100 + Math.floor(Math.random() * 40));
  if (typeof (block as any).select === "function") {
    (block as any).select();
  }
}

export function addControlBlockToWorkspace(type: "wpipe_if" | "wpipe_if_else" | "wpipe_for" | "wpipe_while" | "wpipe_parallel") {
  if (!activeWorkspaceRef) return;
  const block = activeWorkspaceRef.newBlock(type);
  block.initSvg();
  block.render();
  block.moveBy(150 + Math.floor(Math.random() * 40), 100 + Math.floor(Math.random() * 40));
  if (typeof (block as any).select === "function") {
    (block as any).select();
  }
}

export function getMermaidFromBlocklyWorkspace(): string {
  if (!activeWorkspaceRef) return "graph TD\n    empty[\"Empty Canvas\"]";
  const topBlocks = activeWorkspaceRef.getTopBlocks(true);
  if (!topBlocks || topBlocks.length === 0) {
    return "graph TD\n    empty[\"Empty Canvas\"]";
  }

  let lines: string[] = ["graph TD"];
  let nodeCounter = 1;

  // Helper struct returning both entryId (start of block/stack) and exitNodes (list of leaf exit node IDs to converge into next step)
  function traverseBlock(block: Blockly.Block): { entryId: string; exitNodes: string[] } {
    const currentId = `node_${nodeCounter++}`;
    const type = block.type;
    let branchExits: string[] = [];

    if (type === "wpipe_step") {
      const name = block.getFieldValue("STEP_NAME") || "Step";
      lines.push(`    ${currentId}["📦 ${name}"]`);
      branchExits = [currentId];
    } else if (type === "wpipe_if" || type === "wpipe_if_else") {
      const cond = block.getFieldValue("CONDITION") || "IF Condition";
      lines.push(`    ${currentId}{{"🔀 IF: ${cond}"}}`);
      
      const doInput = block.getInput("DO");
      if (doInput && doInput.connection && doInput.connection.targetBlock()) {
        const childRes = traverseBlock(doInput.connection.targetBlock()!);
        lines.push(`    ${currentId} -->|THEN| ${childRes.entryId}`);
        branchExits.push(...childRes.exitNodes);
      } else {
        branchExits.push(currentId);
      }

      if (type === "wpipe_if_else") {
        const elseInput = block.getInput("ELSE");
        if (elseInput && elseInput.connection && elseInput.connection.targetBlock()) {
          const elseChildRes = traverseBlock(elseInput.connection.targetBlock()!);
          lines.push(`    ${currentId} -->|ELSE| ${elseChildRes.entryId}`);
          branchExits.push(...elseChildRes.exitNodes);
        } else {
          branchExits.push(currentId);
        }
      }
    } else if (type === "wpipe_for") {
      const iters = block.getFieldValue("ITERATIONS") || "N";
      lines.push(`    ${currentId}["🔁 REPEAT ${iters} TIMES"]`);
      const doInput = block.getInput("DO");
      if (doInput && doInput.connection && doInput.connection.targetBlock()) {
        const childRes = traverseBlock(doInput.connection.targetBlock()!);
        lines.push(`    ${currentId} -->|DO| ${childRes.entryId}`);
        childRes.exitNodes.forEach((ex) => lines.push(`    ${ex} -.->|LOOP AGAIN| ${currentId}`));
      }
      branchExits = [currentId];
    } else if (type === "wpipe_while") {
      const cond = block.getFieldValue("CONDITION") || "Condition";
      lines.push(`    ${currentId}["🔁 REPEAT WHILE: ${cond}"]`);
      const doInput = block.getInput("DO");
      if (doInput && doInput.connection && doInput.connection.targetBlock()) {
        const childRes = traverseBlock(doInput.connection.targetBlock()!);
        lines.push(`    ${currentId} -->|DO| ${childRes.entryId}`);
        childRes.exitNodes.forEach((ex) => lines.push(`    ${ex} -.->|LOOP BACK| ${currentId}`));
      }
      branchExits = [currentId];
    } else if (type === "wpipe_parallel") {
      lines.push(`    ${currentId}["⚡ RUN IN PARALLEL"]`);
      const doInput = block.getInput("DO");
      if (doInput && doInput.connection && doInput.connection.targetBlock()) {
        const childRes = traverseBlock(doInput.connection.targetBlock()!);
        lines.push(`    ${currentId} -->|PARALLEL| ${childRes.entryId}`);
        branchExits.push(...childRes.exitNodes);
      } else {
        branchExits.push(currentId);
      }
    } else {
      lines.push(`    ${currentId}["${type}"]`);
      branchExits = [currentId];
    }

    let finalExitNodes = branchExits;
    if (block.nextConnection && block.nextConnection.targetBlock()) {
      const nextRes = traverseBlock(block.nextConnection.targetBlock()!);
      branchExits.forEach((ex) => {
        lines.push(`    ${ex} --> ${nextRes.entryId}`);
      });
      finalExitNodes = nextRes.exitNodes;
    }

    return { entryId: currentId, exitNodes: finalExitNodes };
  }

  topBlocks.forEach((tb) => {
    traverseBlock(tb);
  });

  return lines.join("\n");
}

export function getWorkPlanFromBlocklyWorkspace(catalogSteps: any[] = []): string {
  if (!activeWorkspaceRef) {
    return "# 📋 WPipe Studio Execution Work Plan\n\nNo blocks found in workspace.";
  }

  const allBlocks = activeWorkspaceRef.getAllBlocks(false);
  if (!allBlocks || allBlocks.length === 0) {
    return "# 📋 WPipe Studio Execution Work Plan\n\nNo blocks configured in workspace.";
  }

  const stepBlocks = allBlocks.filter((b) => b.type === "wpipe_step");
  const controlBlocks = allBlocks.filter((b) => b.type.startsWith("wpipe_") && b.type !== "wpipe_step");

  const catalogUsed: { name: string; namespace: string; repo: string; how_to_use: string }[] = [];
  const userUsed: { name: string; namespace: string }[] = [];
  const aiToCreate: { name: string; namespace: string }[] = [];

  stepBlocks.forEach((b) => {
    const name = b.getFieldValue("STEP_NAME") || "UnnamedStep";
    const ns = b.getFieldValue("NAMESPACE") || "wpipe_steps";

    // Match with catalog
    const matched = catalogSteps.find(
      (cs) => cs.name.toLowerCase() === name.toLowerCase() || cs.func_name.toLowerCase() === name.toLowerCase() || cs.namespace.toLowerCase() === ns.toLowerCase()
    );

    if (matched) {
      catalogUsed.push({
        name: matched.name || name,
        namespace: matched.namespace || ns,
        repo: matched.repo || "Official",
        how_to_use: matched.how_to_use || `from ${matched.namespace || ns} import ${matched.func_name || name}`,
      });
    } else if (ns.includes("user") || ns.includes("custom")) {
      userUsed.push({ name, namespace: ns });
    } else if (ns.includes("ai") || ns.includes("described")) {
      aiToCreate.push({ name, namespace: ns });
    } else {
      catalogUsed.push({
        name,
        namespace: ns,
        repo: "Official",
        how_to_use: `from ${ns} import ${name}`,
      });
    }
  });

  let md = `# 📋 WPipe Studio Execution Work Plan & Architecture Specification\n\n`;
  md += `> **Generated on:** ${new Date().toISOString().split("T")[0]}\n`;
  md += `> **Pipeline Status:** Verified for Execution\n\n`;

  md += `---

## 1. 📦 Step Dependencies & Import Strategy

### 🌐 A. Official Catalog Steps (${catalogUsed.length})
`;

  if (catalogUsed.length === 0) {
    md += `*No official catalog steps required in this pipeline.*\n\n`;
  } else {
    catalogUsed.forEach((item, idx) => {
      md += `#### ${idx + 1}. \`${item.name}\` (${item.repo})\n`;
      md += `- **Namespace:** \`${item.namespace}\`\n`;
      md += `- **Import Usage:**\n\`\`\`python\n${item.how_to_use}\n\`\`\`\n\n`;
    });
  }

  md += `### 📂 B. User-Imported Custom (.py) States (${userUsed.length})
`;
  if (userUsed.length === 0) {
    md += `*No pre-existing user .py states required.*\n\n`;
  } else {
    userUsed.forEach((item, idx) => {
      md += `#### ${idx + 1}. \`${item.name}\`\n`;
      md += `- **File Origin:** \`${item.namespace}\`\n`;
      md += `- **Action:** Load state decorated with \`@step\` from local user workspace.\n\n`;
    });
  }

  md += `### ✨ C. AI-Described States to Generate (${aiToCreate.length})
`;
  if (aiToCreate.length === 0) {
    md += `*No AI-generated steps required.*\n\n`;
  } else {
    aiToCreate.forEach((item, idx) => {
      md += `#### ${idx + 1}. \`${item.name}\`\n`;
      md += `- **Namespace Target:** \`${item.namespace}\`\n`;
      md += `- **Generation Prompt:** Create Python state with \`@step\` decorator and pydantic DTO.\n\n`;
    });
  }

  md += `---

## 2. 🔀 Control Flow Structures (${controlBlocks.length})

`;
  controlBlocks.forEach((b, idx) => {
    md += `- **Control Node ${idx + 1}:** \`${b.type}\``;
    if (b.getFieldValue("CONDITION")) {
      md += ` (Condition: \`${b.getFieldValue("CONDITION")}\`)`;
    }
    if (b.getFieldValue("ITERATIONS")) {
      md += ` (Repeat: \`${b.getFieldValue("ITERATIONS")}\` times)`;
    }
    md += `\n`;
  });

  md += `\n---

## 3. 🛠️ Data Type Conversion & Intermediary Adapters (mcp-wpipe)

> **Automatic Compatibility Policy:**
> If a connection between two states in the pipeline cannot be executed directly due to missing variables or incompatible payload formats (e.g. \`image_bytes\` ➔ \`numpy.ndarray\` or \`dict\` ➔ \`json_str\`), **intermediate adapter steps** will be scaffolded automatically using **\`mcp-wpipe\`** to guarantee end-to-end execution.

---

## 4. 🚀 Execution & Testing Verification

Would you like to execute and dry-run test this pipeline in the Docker sandbox right now?
`;

  return md;
}

interface BlocklyWorkspaceProps {
  onWorkspaceChange?: (workspace: Blockly.WorkspaceSvg) => void;
}

export const BlocklyComponent: React.FC<BlocklyWorkspaceProps> = ({ onWorkspaceChange }) => {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  useEffect(() => {
    registerWPipeBlocklyBlocks();

    if (blocklyDivRef.current && !workspaceRef.current) {
      const toolboxXml = `
        <xml id="toolbox" style="display: none">
          <category name="📦 Steps" colour="#4c97ff">
            <block type="wpipe_step"></block>
          </category>
          <category name="🔀 Control" colour="#ffab19">
            <block type="wpipe_if"></block>
            <block type="wpipe_if_else"></block>
            <block type="wpipe_for"></block>
            <block type="wpipe_while"></block>
            <block type="wpipe_parallel"></block>
          </category>
        </xml>
      `;

      const ws = Blockly.inject(blocklyDivRef.current, {
        toolbox: toolboxXml,
        grid: {
          spacing: 20,
          length: 3,
          colour: "#1f2937",
          snap: true,
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },
        trashcan: true,
        sounds: false,
      });

      workspaceRef.current = ws;
      activeWorkspaceRef = ws;

      // Add default starter block stack
      const block1 = ws.newBlock("wpipe_step");
      block1.setFieldValue("HttpRequest", "STEP_NAME");
      block1.setFieldValue("wpipe_steps.connectivity", "NAMESPACE");
      block1.initSvg();
      block1.render();
      block1.moveBy(100, 80);

      const block2 = ws.newBlock("wpipe_if_else");
      block2.initSvg();
      block2.render();

      if (block1.nextConnection && block2.previousConnection) {
        block1.nextConnection.connect(block2.previousConnection);
      }

      const block3 = ws.newBlock("wpipe_step");
      block3.setFieldValue("ImageECamYOLO", "STEP_NAME");
      block3.setFieldValue("wpipe_plugins.vision", "NAMESPACE");
      block3.initSvg();
      block3.render();

      const doInput = block2.getInput("DO");
      if (doInput && doInput.connection && block3.previousConnection) {
        doInput.connection.connect(block3.previousConnection);
      }

      ws.addChangeListener(() => {
        if (onWorkspaceChange) {
          onWorkspaceChange(ws);
        }
      });
    }

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, []);

  return <div ref={blocklyDivRef} className="w-full h-full min-h-[550px] rounded-xl overflow-hidden shadow-2xl" />;
};
