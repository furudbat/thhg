import { site, countlines, USE_CODEMIRROR, USE_ACE, USE_FROLALA_EDITOR, WITH_WYSIWYG_EDITOR } from './site'
import * as jsonlint from 'jsonlint';
import * as Mustache from 'mustache';
import * as jsb from 'js-beautify'
import * as ClipboardJS from 'clipboard'
import { ApplicationData, CONFIG_CONTENT_MODE_YAML, CONFIG_CONTENT_MODE_JSON } from './application.data'
import { Layouts, SCROLL_TO_ANIMATION_TIME_MS } from './layouts';
import { SavedConfigs } from './configs';
import { TemplateEditor } from './template.editor';
import { CssEditor } from './css.editor';
import { ConfigEditor } from './config.editor';
import { Preview } from './preview';
import { PreviewEditor } from './preview.editor';

const html_beautify = jsb.html_beautify;

export class Application {

    private _appData: ApplicationData = new ApplicationData();
    private _layouts: Layouts = new Layouts(this._appData);
    private _configs: SavedConfigs = new SavedConfigs(this._appData);
    private _preview: Preview = new Preview(this._appData);
    private _templateEditor: TemplateEditor = new TemplateEditor(this._appData);
    private _cssEditor: CssEditor = new CssEditor(this._appData);
    private _configEditor: ConfigEditor = new ConfigEditor(this._appData, this._configs);
    private _previewEditor: PreviewEditor = new PreviewEditor();

    private _btnPreviewCodeCopy: ClipboardJS | null = null;
    private _btnPreviewCodeCopySpoiler: ClipboardJS | null = null;
    private _btnPreviewCodeCopySpoilerPreview: ClipboardJS | null = null;
    private _btnPreviewCodeCopySpoilerPreviewCredit: ClipboardJS | null = null;

    initEditors() {
        this._templateEditor.initEditor();
        this._cssEditor.initEditor();
        this._configEditor.initEditor();
    }

    generateHTMLFromTemplate(template: string, json: any, css: string, onlypreview: boolean = false) {
        if (typeof json === 'string' || json instanceof String) {
            this._configEditor.clearConfigError();
            try {
                if (json !== '') {
                    json = jsonlint.parse(json);
                }
            } catch (error) {
                json = {};
                const html = error.toString();
                if (onlypreview) {
                    this._preview.setHTMLPreview(html, css);
                } else {
                    this._configEditor.configError = html;
                }
            }
        }

        if (json !== null) {
            this._templateEditor.clearTemplateError();
            try {
                const htmlstr = Mustache.render(template, json);
                this._preview.setHTMLPreview(htmlstr, css);
                if (onlypreview === false) {
                    this._previewEditor.codePreview = html_beautify(htmlstr);
                }
            } catch (error) {
                console.error(error);

                if (onlypreview) {
                    this._preview.setHTMLPreview(error.toString(), css);
                } else {
                    this._templateEditor.templateError = error.toString();
                    this._preview.setHTMLPreview(error.toString(), css);
                    this._previewEditor.codePreview = error.toString();
                }
            }
        }
    }


    generateHTML() {
        const template = this._appData.templateCode;
        const json = this._appData.configCodeJSON;
        const css = this._appData.cssCode;
        this.generateHTMLFromTemplate(template, json, css);
    }

    changeConfigMode(mode: string) {
        this._appData.updateConfigCodesStr();
        this._appData.codeContentMode = mode;
        this._configEditor.initEditor();
    }

    selectPreviewTab() {
        $('#templateTabs a[href="#previewTabContent"]').tab('show');
    }
    selectTemplateTab() {
        $('#templateTabs a[href="#templateTabContent"]').tab('show');
        this._templateEditor.refresh();
    }
    selectCssTab() {
        $('#templateTabs a[href="#cssTabContent"]').tab('show');
        this._cssEditor.refresh();
    }

    init() {
        this._appData.loadFromStorage();

        this.initLayouts();

        this.initSavedConfigs();

        this.initCodePreviewEditor();
        this.initTemplateEditor();
        this.initCssEditor();
        this.initConfigEditor();

        this.initPreview();

        this.initTabs();

        $('[data-toggle="popover"]').popover();
        this.initClipboardButtons();

        var that = this;
        $('.generate-btn').each(function (index) {
            $(this).click(function () {
                that.generateHTML();

                const sectionPreviewCode = $('#sectionPreviewCode') || null;
                const sectionPreviewCodeOffset = (sectionPreviewCode !== null)? sectionPreviewCode.offset() : null;
                if (sectionPreviewCodeOffset) {
                    $('html, body').animate({
                        scrollTop: sectionPreviewCodeOffset.top
                    }, SCROLL_TO_ANIMATION_TIME_MS);
                }
            });
        });
        $('#btnClearTemplateStorage').click(function () {
            that._appData.clearTemplateStorage();
        });
        $('#btnClearSavedConfigsStorage').click(function () {
            that._appData.clearSavedConfigsStorage();
        });

    }


    private initTabs() {
        var that = this;
        $('#templateTabs a[href="#previewTabContent"]').on('click', function (e) {
            that.selectPreviewTab();
        });
        $('#templateTabs a[href="#templateTabContent"]').on('click', function (e) {
            that.selectTemplateTab();
        });
        $('#templateTabs a[href="#cssTabContent"]').on('click', function (e) {
            that.selectCssTab();
        });
        
        /*
        if (getTemplateCode() === '') {
            selectPreviewTab();
        } else {
            selectTemplateTab();
        }
        */
    }

    private initPreview() {
        if (this._appData.isLivePreviewEnabled) {
            $('#chbLivePreview').prop('checked', true);
            this._preview.enableLivePreview();
        }
        else {
            $('#chbLivePreview').prop('checked', false);
            this._preview.disableLivePreview();
        }

        this.generateHTML();

        $('.main-template-editors-preview-container').resizable();
    }

    private initConfigEditor() {
        this._configEditor.clearConfigError();
        this._configEditor.generateConfigEditor();

        if (this._appData.configContentMode === CONFIG_CONTENT_MODE_YAML) {
            $('#chbConfigMode').bootstrapToggle('on');
            this.changeConfigMode(CONFIG_CONTENT_MODE_YAML);
        } else {
            $('#chbConfigMode').bootstrapToggle('off');
            this.changeConfigMode(CONFIG_CONTENT_MODE_JSON);
        }
        
        if (this._appData.isLockConfig) {
            $('#chbLockConfig').bootstrapToggle('on');
            this._configEditor.lockConfig();
        } else {
            $('#chbLockConfig').bootstrapToggle('off');
            this._configEditor.unlockConfig();
        }
        
        $('#collapseConfig').collapse('show');
        
        var that = this;
        $('#chbLockConfig').change(function () {
            const checked = $(this).prop('checked');
            if (checked === true) {
                that._configEditor.lockConfig();
            } else {
                that._configEditor.unlockConfig();
            }
        });
        $('#chbConfigMode').change(function () {
            const checked = $(this).prop('checked');
            if (checked === true) {
                that.changeConfigMode(CONFIG_CONTENT_MODE_YAML);
            } else {
                that.changeConfigMode(CONFIG_CONTENT_MODE_JSON);
            }
        });
        
        $('#collapseConfig').on('show.bs.collapse', function () {
            $('.main-template-editors-preview-container').removeClass('bigger-preview');

            $('.main-config-editors-container').removeClass(function (index, className) {
                return (className.match(/(^|\s)col-\S+/g) || []).join(' ');
            }).addClass('col-md-4');
            $('.main-template-editors-container').removeClass(function (index, className) {
                return (className.match(/(^|\s)col-\S+/g) || []).join(' ');
            }).addClass('col-md-8');
        });
        $('#collapseConfig').on('shown.bs.collapse', function () {
            $('#btnCollapseConfig').html(site.data.strings.editor.config.header).attr('class', 'btn btn-primary');
            $('.main-config-add-container').show();
            that._configs.updateSaveConfigControls();
        });
        $('#collapseConfig').on('hidden.bs.collapse', function () {
            $('.main-config-editors-container').removeClass(function (index, className) {
                return (className.match(/(^|\s)col-\S+/g) || []).join(' ');
            }).addClass('col-md-2');
            $('.main-template-editors-container').removeClass(function (index, className) {
                return (className.match(/(^|\s)col-\S+/g) || []).join(' ');
            }).addClass('col-md-10');

            $('.main-template-editors-preview-container').addClass('bigger-preview');
        });
        $('#collapseConfig').on('hide.bs.collapse', function () {
            $('#btnCollapseConfig').html(site.data.strings.editor.config.header_short).attr('class', 'btn btn-secondary');
            $('.main-config-add-container').hide();
            that._configs.updateSaveConfigControls();
        });
    }

    private initCssEditor() {
        $('#cssEditorLinesBadge').hide();
        this._cssEditor.generateCssEditor();
    }

    private initTemplateEditor() {
        this._templateEditor.clearTemplateError();
        $('#templateEditorLinesBadge').hide();

        var that = this;

        if (WITH_WYSIWYG_EDITOR) {
            this._templateEditor.generateTemplateWYSIWYGEditor();
            
            if (this._appData.isWYSIWYGEditorEnabled) {
                this._templateEditor.enableWYSIWYGEditor();
            } else {
                this._templateEditor.disableWYSIWYGEditor();
            }

            $('#btnEnableWYSIWYGEditor').click(function () {
                if (that._appData.isWYSIWYGEditorEnabled) {
                    that._templateEditor.disableWYSIWYGEditor();
                } else {
                    that._templateEditor.enableWYSIWYGEditor();
                }
            });
        } else {
            this._templateEditor.generateTemplateEditor();
            this._templateEditor.disableWYSIWYGEditor();
        }
        
        $('#chbLivePreview').change(function () {
            let checked = $(this).prop('checked');
            if (checked === true) {
                that._preview.enableLivePreview();
            } else {
                that._preview.disableLivePreview();
            }
        });
    }

    private initCodePreviewEditor() {
        this._previewEditor.generateCodePreviewEditor();
    }

    private initSavedConfigs() {
        this._configs.generateSavedConfigsFromList();
        this._configs.initSaveConfigControls();
    }

    private initLayouts() {
        this._layouts.generateLayoutList();
        this._layouts.clearLayoutInfo();
    }

    private initClipboardButtons(){
        var that = this;
        this._btnPreviewCodeCopy = new ClipboardJS('#btnPreviewCodeCopy', {
            text: function (trigger) {
                return that._previewEditor.codePreview;
            }
        });
        this._btnPreviewCodeCopy.on('success', function (e) {
            $('#btnPreviewCodeCopy').popover('show');
            e.clearSelection();
        });

        this._btnPreviewCodeCopySpoiler = new ClipboardJS('#btnPreviewCodeCopySpoiler', {
            text: function (trigger) {
                const code = that._previewEditor.codePreview;
                const encoded_code = $('<div />').text(code).html();
                return [
                    '<div class="fr-spoiler">',
                    '<pre><code>',
                    encoded_code,
                    '</pre></code>',
                    '</div>'

                ].join('\n');
            }
        });
        this._btnPreviewCodeCopySpoiler.on('success', function (e) {
            $('#btnPreviewCodeCopySpoiler').popover('show');
            e.clearSelection();
        });

        this._btnPreviewCodeCopySpoilerPreview = new ClipboardJS('#btnPreviewCodeCopySpoilerPreview', {
            text: function (trigger) {
                const code = that._previewEditor.codePreview;
                const encoded_code = $('<div />').text(code).html();
                return [
                    '<h2>Code</h2>',
                    '<div class="fr-spoiler">',
                    '<pre><code>',
                    encoded_code,
                    '</pre></code>',
                    '</div>',
                    '',
                    '<h2>Preview</h2>',
                    code,
                ].join('\n');
            }
        });
        this._btnPreviewCodeCopySpoilerPreview.on('success', function (e) {
            $('#btnPreviewCodeCopySpoilerPreview').popover('show');
            e.clearSelection();
        });

        this._btnPreviewCodeCopySpoilerPreviewCredit = new ClipboardJS('#btnPreviewCodeCopySpoilerPreviewCredit', {
            text: function (trigger) {
                const code = that._previewEditor.codePreview;
                var encoded_code = $('<div />').text(code).html();
                return [
                    '<p>', $('#msgLayoutPatternInfo').html(), '</p>',
                    '',
                    '<h2>Code</h2>',
                    '<div class="fr-spoiler">',
                    '<pre><code>',
                    encoded_code,
                    '</pre></code>',
                    '</div>',
                    '',
                    '<h2>Preview</h2>',
                    code,
                ].join('\n');
            }
        });
        this._btnPreviewCodeCopySpoilerPreviewCredit.on('success', function (e) {
            $('#btnPreviewCodeCopySpoilerPreviewCredit').popover('show');
            e.clearSelection();
        });

        $('.copy-to-clipboard[data-toggle="popover"]').on('shown.bs.popover', function () {
            var $pop = $(this);
            setTimeout(function () {
                $pop.popover('hide');
            }, 1200);
        });
    }
}