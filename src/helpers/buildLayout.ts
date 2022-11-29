import { access, readFile } from "fs/promises";
import { render } from "mustache";
import { dirname, join } from "path";
import { BuildLayoutTemplateOptions } from "../types/BuildLayoutTemplateOptions";

export const buildLayout = async (options: BuildLayoutTemplateOptions) => {
    const { templateLayoutSlots, templateLayoutName, templatePartialsFolder, templateFolder } = options;

    const layoutFilePath = join(templateFolder, `${templateLayoutName}.mjml`);

    const layoutFileContent = await readFile(layoutFilePath, "utf-8").catch(() => {
        throw new Error(`[nodemailer-mjml] - Could not read layout template at path: ${layoutFilePath}`);
    });

    const layoutSlotsName = Array.from(layoutFileContent.matchAll(/\{{2}.*slots:(\w*).*\}{2}/g))
        .map((slot) => slot[1]);

    const layoutSlotsContent = Object.fromEntries(
        await Promise.all(
            layoutSlotsName.map(async (slotName) => {
                const slotContent = (templateLayoutSlots ?? {})[slotName];
                if (slotContent) {
                    return [`slots:${slotName}`, `<mj-include path="${slotContent}.mjml" />`];
                }

                const defaultSlotFilePath = join(templateFolder, templatePartialsFolder, `${slotName}.mjml`);
                const hasDefaultSlotFile = await access(defaultSlotFilePath).then(() => true).catch(() => false);
                
                
                if (hasDefaultSlotFile) {
                    const dirBackwardWalk = Array.from({length: dirname(`${templateLayoutName}.mjml`).split("/").length}, () => "../").join("");
                    return [`slots:${slotName}`, `<mj-include path="${join(dirBackwardWalk, templatePartialsFolder, `${slotName}.mjml`)}" />`];
                }

                return [`slots:${slotName}`, ""];
            })
        )
    );

    return render(layoutFileContent, layoutSlotsContent, {}, {escape: (text) => text});
};