declare module 'obsidian' {
  export class Plugin {
    app: any;
    loadData(): Promise<any>;
    saveData(data: any): Promise<any>;
    addCommand(cmd: any): any;
    addSettingTab(tab: any): any;
    registerInterval(id: any): any;
    registerView(viewType: string, factory: (leaf: any) => any): any;
  }

  export class PluginSettingTab {
    constructor(app: any, plugin: Plugin);
    containerEl: any;
    display(): void;
  }

  export class Setting {
    constructor(container: any);
    setName(name: string): Setting;
    setDesc(desc: string): Setting;
    addText(fn: any): Setting;
    addButton(fn: any): Setting;
    addDropdown(fn: any): Setting;
  }

  export class SuggestModal<T> {
    constructor(app: any);
    open(): void;
    getSuggestions(query: string): T[];
    renderSuggestion(item: T, el: HTMLElement): void;
    onChooseSuggestion(item: T, evt?: MouseEvent): void;
  }

  export class ItemView {
    containerEl: any;
    constructor(leaf: any);
    getViewType(): string;
    getDisplayText(): string;
    onOpen?(): void;
    onClose?(): void;
  }

  export class Notice {
    constructor(message: string);
  }

  export const MarkdownRenderer: {
    renderMarkdown(markdown: string, el: HTMLElement, sourcePath: string, plugin: Plugin): Promise<void>;
  };

  export class Modal {
    constructor(app: any);
    contentEl: HTMLElement;
    open(): void;
    close(): void;
    onOpen?(): void;
    onClose?(): void;
  }

  export type TFile = { path: string; basename: string; name: string; parent?: { path: string } };
}
