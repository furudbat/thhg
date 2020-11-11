import { site, countlines } from './site'
import ace from 'brace';
import 'brace/ext/beautify'
import 'brace/ext/textarea'
import 'brace/ext/error_marker'
import 'brace/mode/html';
import 'brace/mode/handlebars';
import 'brace/worker/html'
import 'brace/theme/dracula';
import { ApplicationData, TemplateEngine } from './application.data'
import { ApplicationListener } from './application.listener';

const TEMPLATE_EDITOR_NAME_ACE = 'ace';

export class TemplateEditor {
    
    private _templateEditor: ace.Editor | null = null;
    private _currentTemplateEditorName: string = '';

    private _appData: ApplicationData;
    private _appListener: ApplicationListener;

    constructor(appData: ApplicationData, appListener: ApplicationListener){
        this._appData = appData;
        this._appListener = appListener;
    }
    
    set templateError(error: string) {
        $('#templateError').html(error).show();
    }
    clearTemplateError() {
        $('#templateError').hide().empty();
    }

    updateTemplateLinesOfCodeBadges(code: string) {
        const loc = countlines(code);
        if (loc > 0) {
            $('#templateEditorLinesBadge').html(site.data.strings.editor.lines.format(loc)).show();
        } else {
            $('#templateEditorLinesBadge').hide();
        }
    }

    generateTemplateWYSIWYGEditor() {
        /*
        var that = this;
        var onChangeTemplate = function (value: string) {
            that._appData.templateCode = value;
            that.updateTemplateLinesOfCodeBadges(value);
            if (that._appData.isLivePreviewEnabled) {
                that._appListener.generateHTML();
            }
        };
        */
        /// not supported anymore
    }

    generateTemplateEditor() {
        var that = this;
        var onChangeTemplateEditor = function (value: string) {
            that._appData.templateCode = value;
            that.updateTemplateLinesOfCodeBadges(value);
            if (that._appData.isLivePreviewEnabled) {
                that._appListener.generateHTML();
            }
        };

        $('#txtTemplate').replaceWith('<div id="txtTemplate" class="div-ace-editor"></div>');
        this._templateEditor = ace.edit("txtTemplate");
        this._templateEditor.$blockScrolling = Infinity;
        this._templateEditor.setTheme('ace/theme/dracula');
        this._templateEditor.session.setMode('ace/mode/html');
        this._templateEditor.setShowPrintMargin(false);
        this._templateEditor.session.on('change', function (delta) {
            // delta.start, delta.end, delta.lines, delta.action
            if (that._templateEditor) {
                const value = that._templateEditor.getValue();
                //console.log(delta);
                if (value == '') {
                    that._appData.currentLayoutId = null;
                }
                onChangeTemplateEditor(value);
            }
        });
        this._currentTemplateEditorName = TEMPLATE_EDITOR_NAME_ACE;
    }

    setTemplateEditorValue(code: string) {
        this.updateTemplateLinesOfCodeBadges(code);

        if (this._templateEditor) {
            this._templateEditor.setValue(code);
            this._templateEditor.clearSelection();
        }
    }
    
    initEditor() {
        const templateCode = this._appData.templateCode;
        this.setTemplateEditorValue(templateCode);
        this.updateTemplateLinesOfCodeBadges(templateCode);
        this.updateHelp();
    }

    refresh() {
    }
    
    enableWYSIWYGEditor() {
        this._appData.enableWYSIWYGEditor();
        this.initEditor();

        $('.main-template-editors-editor-container').hide();
        $('.main-template-editors-WYSIWYG-editor-container').show();
        $('#btnEnableWYSIWYGEditor').html(site.data.strings.editor.template.enabled_WYSIWYG_editor_btn).attr('class', 'btn btn-secondary');
    }
    disableWYSIWYGEditor() {
        this._appData.disableWYSIWYGEditor();
        this.initEditor();

        $('.main-template-editors-editor-container').show();
        $('.main-template-editors-WYSIWYG-editor-container').hide();
        $('#btnEnableWYSIWYGEditor').html(site.data.strings.editor.template.disabled_WYSIWYG_editor_btn).attr('class', 'btn btn-outline-secondary');
    }

    updateHelp() {
        $('#lblTemplateEngine').html(this._appData.currentTemplateEngine);

        const template_engine = this._appData.currentTemplateEngine;
        let template_help = site.data.strings.editor.template.template_help_mustache;
        switch(template_engine) {
            case TemplateEngine.Mustache:
                template_help = site.data.strings.editor.template.template_help_mustache;
                break;
            case TemplateEngine.Handlebars:
                template_help = site.data.strings.editor.template.template_help_handlebars;
                break;
            default:
                console.warn('no template_help found for', template_engine);
                break;
        }

        $('#templateHelp').html(template_help);
    }
}