import { site, makeDoubleClick } from './site'
import { ApplicationData } from './application.data.js'
import { ApplicationListener } from './application.listener';

const SAVED_CONFIG_SELECTED_BUTTON_CLASS = 'btn-primary';
const SAVED_CONFIG_NOT_SELECTED_BUTTON_CLASS = 'btn-outline-secondary';
const SAVED_CONFIG_BUTTON_CLASS = 'saved-content-content';

export class SavedConfigs {

    private _appData: ApplicationData;
    private _appListener: ApplicationListener;

    constructor(appData: ApplicationData, appListener: ApplicationListener){
        this._appData = appData;
        this._appListener = appListener;
    }
    
    generateButtonFromConfig(config: any, index: number | null = null) {
        let cssclass: string = 'mr-1 mt-1 mb-2 btn ' + SAVED_CONFIG_BUTTON_CLASS + ' ' + SAVED_CONFIG_NOT_SELECTED_BUTTON_CLASS;
        let name: string = site.data.strings.content.content_default_prefix + ((index !== null) ? (index + 1) : '');
        
        if (config) {
            if ('title' in config && config.title !== '') {
                name = config.title;
            } else if ('name' in config && config.name !== '') {
                name = config.name;
            }
        }

        return $('<button type="button" class="' + cssclass + '" data-index="' + index + '">' + name + '</button>');
    }
    
    addSavedConfigToList(config: any, index: number | null) {
        if (config === null || index === null) {
            console.error('addSavedConfigToList', 'config or index are null', { config, index });
            return;
        }
        let configButton = this.generateButtonFromConfig(config, index);
        $('.saved-content-list').append(configButton);
        makeDoubleClick($('.' + SAVED_CONFIG_BUTTON_CLASS + "[data-index='" + index + "']"), this.overrideConfig, this.previewWithConfig);

        //console.debug('addSavedConfigToList', index, config, configButton, $('.saved-content-list').find('.' + SAVED_CONFIG_BUTTON_CLASS).last());

        this.updateSaveConfigControls();
    }
    generateSavedConfigsFromList() {
        if (this._appData.savedConfigs.length > 0) {
            $('.saved-content-list').empty();
            const savedConfigs = this._appData.savedConfigs;
            for (let i = 0; i < savedConfigs.length; i++) {
                let config = savedConfigs[i].json;
                //console.debug(i, config);
                this.addSavedConfigToList(config, i);
            }
            $('.saved-content-container').show();
        } else {
            $('.saved-content-list').empty();
            $('.saved-content-container').hide();
        }

        this.updateSavedConfigsSelection(this._appData.currentConfigIndex);
    }

    updateSaveConfigControls() {
        if (this._appData.currentConfigIndex !== null && this._appData.currentConfigIndex < this._appData.savedConfigs.length) {
            $('#btnSaveConfig').show();
        } else {
            $('#btnSaveConfig').hide();
        }
        if ($('#configError').is(":visible")) {
            $('.main-config-controls').each(function () {
                $(this).prop('disabled', true);
            });
        } else {
            $('.main-config-controls').each(function () {
                $(this).prop('disabled', false);
            });
        }
    }
    updateSavedConfigsSelection(index: number | null) {
        if (this._appData.savedConfigs.length > 0) {
            $('.saved-content-container').show();
        } else {
            $('.saved-content-container').hide();
        }

        $('.' + SAVED_CONFIG_BUTTON_CLASS).each(function (i) {
            $(this).removeClass(SAVED_CONFIG_SELECTED_BUTTON_CLASS).removeClass(SAVED_CONFIG_NOT_SELECTED_BUTTON_CLASS);
            if (index !== null && $(this).data('index') == index) {
                $(this).addClass(SAVED_CONFIG_SELECTED_BUTTON_CLASS);
            } else {
                $(this).addClass(SAVED_CONFIG_NOT_SELECTED_BUTTON_CLASS);
            }
        });
    }

    initSaveConfigControls() {
        var savedConfigs = $('.' + SAVED_CONFIG_BUTTON_CLASS);

        var that = this;
        if (savedConfigs && savedConfigs.length) {
            savedConfigs.each(function () {
                makeDoubleClick($(this), that.overrideConfig, that.previewWithConfig);
            });
        }
        $('#btnAddConfig').click(function () {
            that._appData.addCurrentConfig();
            //console.debug('btnAddConfig', {_currentConfigIndex});

            const savedConfig = that._appData.currentSavedConfigJson;
            if (savedConfig !== null) {
                that.addSavedConfigToList(savedConfig.json, that._appData.currentConfigIndex);
            }
            that.updateSavedConfigsSelection(that._appData.currentConfigIndex);
        });

        $('#btnSaveConfig').click(function () {
            if (that._appData.currentConfigIndex !== null) {
                that._appData.saveConfig(that._appData.currentConfigIndex, that._appData.configJson, that._appData.configJsonStr, that._appData.configYamlStr);
            } else {
                console.error('btnSaveConfig', 'currentConfigIndex is null');
            }

            const savedConfig = that._appData.currentSavedConfigJson;
            if (savedConfig !== null) {
                let savedConfigBtn = $('.' + SAVED_CONFIG_BUTTON_CLASS + "[data-index='" + that._appData.currentConfigIndex + "']");
                if (savedConfigBtn) {
                    let configButton = that.generateButtonFromConfig(savedConfig.json, that._appData.currentConfigIndex);
                    savedConfigBtn.replaceWith(configButton);
                    makeDoubleClick($('.' + SAVED_CONFIG_BUTTON_CLASS + "[data-index='" + that._appData.currentConfigIndex + "']"), that.overrideConfig, that.previewWithConfig);
                }
            }
            that.updateSavedConfigsSelection(that._appData.currentConfigIndex);
        });

        this.updateSaveConfigControls();
    }

    private overrideConfig (configButton: any) {
        let index = $(configButton).data('index');
        if (index === null || index === '') {
            console.error('overrideConfig', 'index is empty');
            return;
        }

        //console.debug('overrideConfig', {index, configButton});

        this._appData.currentConfigIndex = parseInt(index);

        const savedConfig = this._appData.currentSavedConfigJson();
        if (savedConfig !== null) {
            this._appData.configJson = savedConfig.json;
            this._appData.configJsonStr = savedConfig.jsonstr;
            this._appData.configYamlStr = savedConfig.yamlstr;

            this._appListener.initEditors();
            this._appListener.generateHTML();
        } else {
            this._appData.currentConfigIndex = null;
        }

        this.updateSaveConfigControls();
        this.updateSavedConfigsSelection(this._appData.currentConfigIndex);
    };

    private previewWithConfig (configButton: any) {
        const index = $(configButton).data('index');
        if (index === null || index === '') {
            console.error('previewWithConfig', 'index is empty');
            return;
        }

        //console.debug('previewWithConfig', {index, configButton});

        this._appData.currentConfigIndex = parseInt(index);

        const savedConfig = this._appData.currentSavedConfigJson;
        if (savedConfig !== null) {
            const template = this._appData.templateCode;
            const css = this._appData.cssCode;

            this._appListener.generateHTMLFromTemplate(template, savedConfig.json, css, true);
            this._appListener.selectPreviewTab();
        }
    };
}