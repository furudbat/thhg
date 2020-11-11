import { site, USE_CACHE } from './site'
import 'mustache'
import 'handlebars'
import 'hogan.js'
import 'pug'
import 'underscore'
import 'dot'
import cons from '../lib/consolidate'
import * as jsb from 'js-beautify'
import ClipboardJS from 'clipboard'
import parseJson from 'json-parse-better-errors';
import { ApplicationData, CONFIG_CONTENT_MODE_YAML, CONFIG_CONTENT_MODE_JSON, TemplateEngine } from './application.data'
import { ApplicationListener } from './application.listener'
import { Layouts, SCROLL_TO_ANIMATION_TIME_MS } from './layouts'
import { SavedConfigs } from './configs'
import { TemplateEditor } from './template.editor'
import { CssEditor } from './css.editor'
import { ConfigEditor } from './config.editor'
import { Preview } from './preview'
import { PreviewEditor } from './preview.editor'

const html_beautify = jsb.html_beautify;

const CLIPBOARD_POPOVER_DELAY_MS: number = 1200;

export class Application implements ApplicationListener {

    private _appData: ApplicationData = new ApplicationData();
    private _layouts: Layouts = new Layouts(this._appData, this);
    private _configs: SavedConfigs = new SavedConfigs(this._appData, this);
    private _preview: Preview = new Preview(this._appData);
    private _templateEditor: TemplateEditor = new TemplateEditor(this._appData, this);
    private _cssEditor: CssEditor = new CssEditor(this._appData, this);
    private _configEditor: ConfigEditor = new ConfigEditor(this._appData, this._configs, this);
    private _previewEditor: PreviewEditor = new PreviewEditor();

    private _btnPreviewCodeCopy: ClipboardJS | null = null;
    private _btnPreviewCodeCopySpoiler: ClipboardJS | null = null;
    private _btnPreviewCodeCopySpoilerPreview: ClipboardJS | null = null;

    initEditors() {
        this._templateEditor.initEditor();
        this._cssEditor.initEditor();
        this._configEditor.initEditor();
    }

    generateHTMLFromTemplate(id: string | null, template_engine: string, template: string, json: any, css: string, onlypreview: boolean = false) {
        if (typeof json === 'string' || json instanceof String) {
            this._configEditor.clearConfigError();
            try {
                if (json !== '') {
                    json = parseJson(json as string);
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
            var handleError = (error: Error) => {
                console.error(error);

                if (onlypreview) {
                    this._preview.setHTMLPreview(error.toString(), css);
                } else {
                    this._templateEditor.templateError = error.toString();
                    this._preview.setHTMLPreview(error.toString(), css);
                    this._previewEditor.codePreview = error.toString();
                }
            };
            try {
                var that = this;
                if (USE_CACHE) {
                    json._cache = true;
                }
                if (id) {
                    json._id = id;
                }

                let renderHTML = function (html: string) {
                    //console.log('renderHTML', template, json, html);
                    that._preview.setHTMLPreview(html, css);
                    if (onlypreview === false) {
                        that._previewEditor.codePreview = html_beautify(html);
                    }
                };

                let handler = function (err: Error, html: string) {
                    if(err) {
                        handleError(err);
                        return;
                    }
                    renderHTML(html);
                };

                console.log('generateHTMLFromTemplate', {template_engine, template, json})

                switch (template_engine) {
                    case TemplateEngine.Mustache:
                        return cons.mustache.render(template, json, handler);
                    case TemplateEngine.Handlebars:
                        return cons.handlebars.render(template, json, handler);
                    case TemplateEngine.Hugan:
                        return cons.hogan.render(template, json, handler);
                    case TemplateEngine.Pug:
                        return cons.pug.render(template, json, handler);
                    case TemplateEngine.Underscore:
                        return cons.underscore.render(template, json, handler);
                    case TemplateEngine.Dot:
                        return cons.dot.render(template, json, handler);
                    case TemplateEngine.EJS:
                        return cons.ejs.render(template, json, handler);
                }

                console.warn('template_engine uknown', {template_engine})
                
                return cons.mustache.render(template, json, handler);
            } catch (error) {
                handleError(error);
            }
        }
    }


    generateHTML() {
        const id = this._appData.currentLayoutId || null;
        const template_engine = this._appData.currentTemplateEngine || TemplateEngine.Mustache;
        const template = this._appData.templateCode;
        const json = this._appData.configCodeJSON;
        const css = this._appData.cssCode;
        //console.log('generateHTML', {template_engine, template, json, css});
        this.generateHTMLFromTemplate(id, template_engine, template, json, css);
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
        $('[data-toggle="popover"]').popover();

        this.initTabs();

        this.initClipboardButtons();

        var that = this;
        $('.generate-btn').each(function (index) {
            $(this).on('click', function () {
                that.generateHTML();

                const sectionPreviewCode = $('#sectionPreviewCode') || null;
                const sectionPreviewCodeOffset = (sectionPreviewCode !== null) ? sectionPreviewCode.offset() : null;
                if (sectionPreviewCodeOffset) {
                    $('html, body').animate({
                        scrollTop: sectionPreviewCodeOffset.top
                    }, SCROLL_TO_ANIMATION_TIME_MS);
                }
            });
        });
        $('#btnClearSessionStorage').on('click', function () {
            that._appData.clearSessionStorage();
        });
        $('#btnClearSavedConfigsStorage').on('click', function () {
            that._appData.clearSavedConfigsStorage();
        });
        
        this._appData.loadFromStorage().then(function () {
            that.initLayouts();

            that.initSavedConfigs();

            that.initCodePreviewEditor();
            that.initTemplateEditor();
            that.initCssEditor();
            that.initConfigEditor();

            that.initEditors();
            that.initPreview();
            if (that._appData.currentLayoutId) {
                that._layouts.reloadLayoutInfo(that._appData.currentLayoutId);
            }

            console.log('app data loaded from storage');
        });

        console.log('init done');
    }


    private async initTabs() {
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

    private async initPreview() {
        if (this._appData.isLivePreviewEnabled) {
            $('#chbLivePreview').prop('checked', true);
            this._preview.enableLivePreview();
        }
        else {
            $('#chbLivePreview').prop('checked', false);
            this._preview.disableLivePreview();
        }

        this.generateHTML();
        //$('.main-template-editors-preview-container').resizable();
    }

    private async initConfigEditor() {
        this._configEditor.clearConfigError();
        this._configEditor.generateConfigEditor();

        if (this._appData.configContentMode === CONFIG_CONTENT_MODE_YAML) {
            $('#chbConfigMode').bootstrapToggle('on');
        } else {
            $('#chbConfigMode').bootstrapToggle('off');
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
        $('#chbLockConfig').on('change', function () {
            const checked = $(this).prop('checked');
            if (checked === true) {
                that._configEditor.lockConfig();
            } else {
                that._configEditor.unlockConfig();
            }
        });
        $('#chbConfigMode').on('change', function () {
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

    private async initCssEditor() {
        $('#cssEditorLinesBadge').hide();
        this._cssEditor.generateCssEditor();
    }

    private async initTemplateEditor() {
        this._templateEditor.clearTemplateError();
        $('#templateEditorLinesBadge').hide();

        var that = this;

        this._templateEditor.generateTemplateEditor();
        this._templateEditor.disableWYSIWYGEditor();

        $('#chbLivePreview').on('change', function () {
            const checked = $(this).prop('checked');
            if (checked) {
                that._preview.enableLivePreview();
            } else {
                that._preview.disableLivePreview();
            }
        });
        
        this._templateEditor.updateHelp();
    }

    private async initCodePreviewEditor() {
        this._previewEditor.generateCodePreviewEditor();
    }

    private async initSavedConfigs() {
        this._configs.generateSavedConfigsFromList();
        this._configs.initSaveConfigControls();
    }

    private async initLayouts() {
        this._layouts.generateLayoutList();
        this._layouts.clearLayoutInfo();
    }

    private async initClipboardButtons() {
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

        $('.copy-to-clipboard[data-toggle="popover"]').on('shown.bs.popover', function () {
            var $pop = $(this);
            setTimeout(function () {
                $pop.popover('hide');
            }, CLIPBOARD_POPOVER_DELAY_MS);
        });
    }
}