/**
 * VTT Card Display - Settings Tab
 */
import { PluginSettingTab, Setting, App } from 'obsidian';
import type { Settings } from './types';
import type VttCardDisplay from './main';

export class VttCardDisplaySettingTab extends PluginSettingTab {
  plugin: VttCardDisplay;
  
  constructor(app: App, plugin: VttCardDisplay) {
    super(app, plugin);
    this.plugin = plugin;
  }
  
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Cards folder path')
      .setDesc('Relative path in vault to images (e.g., "Cards"). Leave blank to use all images in vault.')
      .addText((text) => text
        .setPlaceholder('Cards')
        .setValue(this.plugin.settings.folderPath)
        .onChange(async (v) => {
          this.plugin.settings.folderPath = v;
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.loadCards();
          await this.plugin.loadMaps();
          this.plugin.sendCurrentToPopout();
        }));

    new Setting(containerEl)
      .setName('Maps folder path')
      .setDesc('Relative path in vault to map pages and media (e.g., "Maps"). Leave blank to use all notes/media in vault.')
      .addText((text) => text
        .setPlaceholder('Maps')
        .setValue(this.plugin.settings.mapsFolderPath || '')
        .onChange(async (v) => {
          this.plugin.settings.mapsFolderPath = v;
          await this.plugin.saveData(this.plugin.settings);
          await this.plugin.loadMaps();
        }));

    new Setting(containerEl)
      .setName('Popout left,top,width,height')
      .addText((text) => text
        .setPlaceholder('left,top,width,height')
        .setValue(`${this.plugin.settings.popoutLeft},${this.plugin.settings.popoutTop},${this.plugin.settings.popoutWidth},${this.plugin.settings.popoutHeight}`)
        .onChange(async (v) => {
          const [l, t, w, h] = v.split(',').map((x) => parseInt(x.trim()) || 0);
          this.plugin.settings.popoutLeft = l;
          this.plugin.settings.popoutTop = t;
          this.plugin.settings.popoutWidth = w;
          this.plugin.settings.popoutHeight = h;
          await this.plugin.saveData(this.plugin.settings);
        }));

    new Setting(containerEl)
      .setName('Statblock selectors')
      .setDesc('Comma-separated CSS selectors used to locate the statblock in rendered HTML (e.g. .statblock,.quickmonster).')
      .addText((text) => text
        .setPlaceholder('.statblock,.quickmonster')
        .setValue(this.plugin.settings.statblockSelectors || '')
        .onChange(async (v) => {
          this.plugin.settings.statblockSelectors = v;
          await this.plugin.saveData(this.plugin.settings);
        }));

    new Setting(containerEl)
      .setName('Show Player Info')
      .setDesc('When enabled, the "# Player Infos" section from notes will be shown in the popout.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showPlayerInfo || false)
        .onChange(async (v) => {
          this.plugin.settings.showPlayerInfo = v;
          await this.plugin.saveData(this.plugin.settings);
        }));

    // Grid and Fog of War Settings
    containerEl.createEl('h3', { text: 'Grid & Fog of War' });

    new Setting(containerEl)
      .setName('Default Grid Size')
      .setDesc('Default size of grid squares in pixels (10-200)')
      .addSlider((slider) => slider
        .setLimits(10, 200, 5)
        .setValue(this.plugin.settings.gridSize ?? 50)
        .setDynamicTooltip()
        .onChange(async (v) => {
          this.plugin.settings.gridSize = v;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    new Setting(containerEl)
      .setName('Default Grid Color')
      .setDesc('Default color of the grid overlay')
      .addColorPicker((picker) => picker
        .setValue(this.plugin.settings.gridColor ?? '#ffffff')
        .onChange(async (v) => {
          this.plugin.settings.gridColor = v;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    new Setting(containerEl)
      .setName('Default Grid Opacity')
      .setDesc('Default opacity of the grid (5-100%)')
      .addSlider((slider) => slider
        .setLimits(5, 100, 5)
        .setValue(Math.round((this.plugin.settings.gridOpacity ?? 0.3) * 100))
        .setDynamicTooltip()
        .onChange(async (v) => {
          this.plugin.settings.gridOpacity = v / 100;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    new Setting(containerEl)
      .setName('Default Fog Reveal Size')
      .setDesc('Default brush size for revealing fog of war in pixels (10-150)')
      .addSlider((slider) => slider
        .setLimits(10, 150, 5)
        .setValue(this.plugin.settings.fogRevealSize ?? 30)
        .setDynamicTooltip()
        .onChange(async (v) => {
          this.plugin.settings.fogRevealSize = v;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.sendSettingsToPopout();
        }));

    containerEl.createEl('h3', { text: 'Registered items (projectable)' });
    const list = containerEl.createEl('div');
    
    const renderList = () => {
      list.empty();
      (this.plugin.settings.items || []).forEach((it, idx) => {
        const row = list.createDiv({ cls: 'vtt-item-row' });
        row.createEl('strong', { text: it.title || it.id });
        row.createEl('div', { text: `id: ${it.id}` });
        
        const s = new Setting(row);
        s.addDropdown((dd) => dd
          .addOption('image', 'Image')
          .addOption('card', 'Card (from Cards folder)')
          .addOption('map', 'Map (from Maps folder)')
          .addOption('note', 'Note (any folder)')
          .addOption('statblock', 'Statblock (note)')
          .addOption('note-image', 'First image in note')
          .setValue(it.type || 'image')
          .onChange(async (v) => {
            it.type = v as any;
            await this.plugin.saveData(this.plugin.settings);
            renderList();
          }));
        
        if (it.type === 'card' || it.type === 'map') {
          s.addDropdown((dd2) => {
            dd2.addOption('', '-- select --');
            const itemList = it.type === 'map' ? (this.plugin.maps || []) : (this.plugin.cards || []);
            itemList.forEach((c: any) => dd2.addOption(c.path, c.path));
            dd2.setValue(it.value || '');
            dd2.onChange(async (v) => {
              it.value = v;
              await this.plugin.saveData(this.plugin.settings);
            });
          });
        } else {
          s.addText((text) => text
            .setPlaceholder('value (path)')
            .setValue(it.value || '')
            .onChange(async (v) => {
              it.value = v;
              await this.plugin.saveData(this.plugin.settings);
            }));
        }
        
        s.addButton((bt) => bt
          .setButtonText('Delete')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.items!.splice(idx, 1);
            await this.plugin.saveData(this.plugin.settings);
            renderList();
          }));
      });
    };
    renderList();

    new Setting(containerEl)
      .addButton((b) => b.setButtonText('Add item').onClick(async () => {
        const id = `item${Date.now()}`;
        this.plugin.settings.items = this.plugin.settings.items || [];
        this.plugin.settings.items.push({
          id,
          title: `Note ${this.plugin.settings.items.length + 1}`,
          type: 'note',
          value: ''
        });
        await this.plugin.saveData(this.plugin.settings);
        renderList();
      }));

    new Setting(containerEl)
      .addButton((b) => b.setButtonText('Create Map Page').onClick(async () => {
        this.plugin.openMapCreateModal();
      }));
  }
}
