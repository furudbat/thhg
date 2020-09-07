import * as jsyaml from 'js-yaml';
import localForage from "localforage";
import { SavedConfigValue } from './savedconfig.values';
import { assert } from 'console';

const STORAGE_KEY_TEMPLATE_CODE = 'template_code';
const STORAGE_KEY_CONFIG_CODE = 'config_code';
const STORAGE_KEY_CONFIG_CODE_JSON = 'config_code_json';
const STORAGE_KEY_CONFIG_CODE_YAML = 'config_code_yaml';
const STORAGE_KEY_CSS_CODE = 'css_code';
const STORAGE_KEY_LOCK_CONFIG_CODE = 'lock_config_code';
const STORAGE_KEY_ENABLE_WYSIWYG_TEMPLATE_EDITOR = 'enable_WYSIWYG_template_editor';
const STORAGE_KEY_ENABLE_LIVE_PREVIEW = 'enable_live_preview';
const STORAGE_KEY_CURRENT_CONFIG_INDEX = 'current_config_index';
const STORAGE_KEY_SAVED_CONFIGS = 'saved_configs';
const STORAGE_KEY_CONFIG_CONTENT_MODE = 'config_content_mode';
const STORAGE_KEY_CURRENT_LAYOUT_ID ='current_layout_id'

export const CONFIG_CONTENT_MODE_JSON = 'application/json';
export const CONFIG_CONTENT_MODE_YAML = 'text/x-yaml';

export class ApplicationData {

    private _storeSession = localForage.createInstance({
        name: "session"
    });
    private _storeConfigs = localForage.createInstance({
        name: "configs"
    });

    private _templateCode: string = '';
    private _configJson: unknown = {};
    private _configJsonStr: string = '';
    private _configYamlStr: string = '';
    private _cssCode: string = '';
    private _lockConfigCode: boolean = false;
    private _enableWYSIWYGTemplateEditor: boolean = false;
    private _enableLivePreview: boolean = true;
    private _configContentMode = CONFIG_CONTENT_MODE_JSON;
    private _currentLayoutId: string | null = null;

    private _currentConfigIndex: number | null = null;
    private _savedConfigs: SavedConfigValue[] = [];

    constructor() {
    }

    async loadFromStorage() {
        try {
            this._templateCode = await this._storeSession.getItem(STORAGE_KEY_TEMPLATE_CODE) || this._templateCode;

            this._configJson = await this._storeSession.getItem<unknown>(STORAGE_KEY_CONFIG_CODE) || this._configJson;
            this._configJsonStr = await this._storeSession.getItem<string>(STORAGE_KEY_CONFIG_CODE_JSON) || this.configCodeJSON;
            this._configYamlStr = await this._storeSession.getItem<string>(STORAGE_KEY_CONFIG_CODE_YAML) || this.configCodeYAML;

            this._cssCode = await this._storeSession.getItem<string>(STORAGE_KEY_CSS_CODE) || this._cssCode;
            this._lockConfigCode = await this._storeSession.getItem<boolean>(STORAGE_KEY_LOCK_CONFIG_CODE) || this._lockConfigCode;
            this._enableWYSIWYGTemplateEditor = await this._storeSession.getItem<boolean>(STORAGE_KEY_ENABLE_WYSIWYG_TEMPLATE_EDITOR) || this._enableWYSIWYGTemplateEditor;
            this._enableLivePreview = await this._storeSession.getItem<boolean>(STORAGE_KEY_ENABLE_LIVE_PREVIEW) || this._enableLivePreview;
            this._configContentMode = await this._storeSession.getItem<string>(STORAGE_KEY_CONFIG_CONTENT_MODE) || this._configContentMode;
            this._currentLayoutId = await this._storeSession.getItem<string>(STORAGE_KEY_CURRENT_LAYOUT_ID) || this._currentLayoutId;

            this._currentConfigIndex = await this._storeConfigs.getItem<number>(STORAGE_KEY_CURRENT_CONFIG_INDEX) || this._currentConfigIndex;
            this._savedConfigs = await this._storeConfigs.getItem<SavedConfigValue[]>(STORAGE_KEY_SAVED_CONFIGS) || this._savedConfigs;

            //console.debug('loadFromStorage', { _templateCode, _configJson, _cssCode, _lockConfigCode, _enableWYSIWYGTemplateEditor, _enableLivePreview, _currentConfigIndex, _savedConfigs });
        } catch (err) {
            // This code runs if there were any errors.
            console.error('loadFromStorage', err);
        }
    }

    clearSessionStorage() {
        this._storeSession.clear();
    }
    clearSavedConfigsStorage() {
        this._storeConfigs.clear();
    }

    get templateCode() {
        return this._templateCode;
    }
    get configJson() {
        return this._configJson;
    }
    get configCodeJSON() {
        return JSON.stringify(this._configJson, null, 4);
    }
    get configCodeYAML() {
        return jsyaml.dump(this._configJson, { indent: 4, lineWidth: 80 });
    }
    get configContentMode() {
        return this._configContentMode;
    }
    get cssCode() {
        return this._cssCode;
    }

    set templateCode(code: string) {
        this._templateCode = code;
        this._storeSession.setItem(STORAGE_KEY_TEMPLATE_CODE, this._templateCode);
    }
    set configJson(json: unknown) {
        if (json !== null) {
            this._configJson = json;
            assert(this._configJson !== undefined);
            this._storeSession.setItem(STORAGE_KEY_CONFIG_CODE, this._configJson);
        }
    }
    set cssCode(code: string) {
        this._cssCode = code;
        assert(this._cssCode !== undefined);
        this._storeSession.setItem(STORAGE_KEY_CSS_CODE, this._cssCode);
    }
    set codeContentMode(mode: string) {
        this._configContentMode = mode;
        assert(this._configContentMode !== undefined);
        this._storeSession.setItem(STORAGE_KEY_CONFIG_CONTENT_MODE, this._configContentMode);
    }
    get codeContentMode() {
        return this._configContentMode;
    }

    get isLivePreviewEnabled(): boolean {
        return this._enableLivePreview === true;
    }
    get isLivePreviewDisabled(): boolean {
        return this._enableLivePreview === false;
    }

    enableLivePreview() {
        this._enableLivePreview = true;
        assert(this._enableLivePreview !== undefined);
        this._storeSession.setItem(STORAGE_KEY_ENABLE_LIVE_PREVIEW, this._enableLivePreview);
    }
    disableLivePreview() {
        this._enableLivePreview = false;
        assert(this._enableLivePreview !== undefined);
        this._storeSession.setItem(STORAGE_KEY_ENABLE_LIVE_PREVIEW, this._enableLivePreview);
    }

    set currentLayoutId(id: string | null) {
        this._currentLayoutId = id;
        assert(this._currentLayoutId !== undefined);
        this._storeSession.setItem(STORAGE_KEY_CURRENT_LAYOUT_ID, this._currentLayoutId);
    }
    get currentLayoutId() {
        return this._currentLayoutId;
    }

    get savedConfigs() {
        return this._savedConfigs;
    }
    get currentSavedConfigJson() {
        return (this._currentConfigIndex !== null && this._currentConfigIndex < this._savedConfigs.length) ? this._savedConfigs[this._currentConfigIndex] : null;
    }

    saveConfigs() {
        assert(this._currentConfigIndex !== undefined);
        assert(this._savedConfigs !== undefined);
        this._storeConfigs.setItem(STORAGE_KEY_CURRENT_CONFIG_INDEX, this._currentConfigIndex);
        this._storeConfigs.setItem(STORAGE_KEY_SAVED_CONFIGS, this._savedConfigs);
    }
    addConfig(json: unknown, jsonstr: string, yamlstr: string) {
        if (json !== null) {
            this._savedConfigs.push({ json, jsonstr, yamlstr });
            this._currentConfigIndex = this._savedConfigs.length - 1;
            this.saveConfigs();
        }
    }
    saveConfig(index: number, json: unknown, jsonstr: string, yamlstr: string) {
        if (index < this._savedConfigs.length) {
            this._savedConfigs[index] = { json, jsonstr, yamlstr };
            this.saveConfigs();
        }
    }
    addCurrentConfig() {
        this.addConfig(this.configJson, this.configJsonStr, this.configYamlStr);
    }

    updateConfigCodesStr() {
        this.configJsonStr = this.configCodeJSON;
        this.configYamlStr = this.configCodeYAML;
    }

    set configJsonStr(jsonstr: string) {
        this._configJsonStr = jsonstr;
        assert(this._configJsonStr !== undefined);
        this._storeSession.setItem(STORAGE_KEY_CONFIG_CODE_JSON, this._configJsonStr);
    }
    set configYamlStr(yamlstr: string) {
        this._configYamlStr = yamlstr;
        assert(this._configYamlStr !== undefined);
        this._storeSession.setItem(STORAGE_KEY_CONFIG_CODE_YAML, this._configYamlStr);
    }

    get configJsonStr() {
        return this._configJsonStr;
    }
    get configYamlStr() {
        return this._configYamlStr;
    }

    lockConfig() {
        this._lockConfigCode = true;
        assert(this._lockConfigCode !== undefined);
        this._storeSession.setItem(STORAGE_KEY_LOCK_CONFIG_CODE, this._lockConfigCode);
    }
    unlockConfig() {
        this._lockConfigCode = false;
        assert(this._lockConfigCode !== undefined);
        this._storeSession.setItem(STORAGE_KEY_LOCK_CONFIG_CODE, this._lockConfigCode);
    }

    get isLockConfig() {
        return this._lockConfigCode;
    }

    enableWYSIWYGEditor() {
        this._enableWYSIWYGTemplateEditor = true;
        assert(this._enableWYSIWYGTemplateEditor !== undefined);
        this._storeSession.setItem(STORAGE_KEY_ENABLE_WYSIWYG_TEMPLATE_EDITOR, this._enableWYSIWYGTemplateEditor);
    }
    disableWYSIWYGEditor() {
        this._enableWYSIWYGTemplateEditor = false;
        assert(this._enableWYSIWYGTemplateEditor !== undefined);
        this._storeSession.setItem(STORAGE_KEY_ENABLE_WYSIWYG_TEMPLATE_EDITOR, this._enableWYSIWYGTemplateEditor);
    }

    get isWYSIWYGEditorEnabled() {
        return this._enableWYSIWYGTemplateEditor;
    }

    get currentConfigIndex() {
        return this._currentConfigIndex;
    }

    set currentConfigIndex(index: number | null) {
        this._currentConfigIndex = index;
        assert(this._currentConfigIndex !== undefined);
        this._storeSession.setItem(STORAGE_KEY_CURRENT_CONFIG_INDEX, this._currentConfigIndex);
    }
}