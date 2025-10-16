/**
 * SaveSnap.jsx
 * @version 1.0.2
 * @author AE Buddy
 * @description コンポジションの現在フレームをPNG形式で保存するツール
 */

(function(thisObj) {
    //====================================
    // 定数と設定
    //====================================
    var APP_NAME = "SaveSnap";
    var CONFIG_SECTION = "SaveSnap";
    var EXTENSION = ".png";
    
    // UIサイズ定数
    var UI_SIZES = {
        LABEL_WIDTH: 70,
        DROPDOWN_WIDTH: 200,
        EDIT_WIDTH: 165,
        SMALL_BTN_WIDTH: 25,
        SMALL_BTN_HEIGHT: 25,
        CONTROL_HEIGHT: 25,
        BIG_BTN_WIDTH: 100,
        BIG_BTN_HEIGHT: 30,
        SPACING: 15,
        MARGIN: [35, 25, 35, 25],
        GROUP_MARGIN: [10, 10, 10, 0]
    };

    //====================================
    // ユーティリティ関数
    //====================================
    
    /**
     * 言語に応じたテキストを取得
     * @param {String} enText - 英語テキスト
     * @param {String} jpText - 日本語テキスト
     * @return {String} 言語に応じたテキスト
     */
    function localize(enText, jpText) {
        return (app.language === Language.JAPANESE) ? jpText : enText;
    }
    
    /**
     * 設定を保存
     * @param {String} key - 設定キー
     * @param {any} value - 設定値
     */
    function saveUserPref(key, value) {
        app.settings.saveSetting(CONFIG_SECTION, key, value);
    }
    
    /**
     * 設定を読み込み
     * @param {String} key - 設定キー
     * @param {any} defaultValue - デフォルト値
     * @return {any} 設定値
     */
    function getUserPref(key, defaultValue) {
        if (!app.settings.haveSetting(CONFIG_SECTION, key)) {
            saveUserPref(key, defaultValue);
        }
        return app.settings.getSetting(CONFIG_SECTION, key);
    }
    
    /**
     * フレーム番号をタイムコードに変換
     * @param {Number} frameCount - フレーム数
     * @param {Number} fps - フレームレート
     * @return {String} タイムコード（hh:mm:ss:ff）
     */
    function convertFrameToTimecode(frameCount, fps) {
        var totalSec = Math.floor(frameCount / fps);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        var f = Math.floor(frameCount % fps);
        
        function pad(n) {
            return (n < 10) ? "0" + n : String(n);
        }
        
        return pad(h) + ":" + pad(m) + ":" + pad(s) + ":" + pad(f);
    }
    
    /**
     * ファイル名から無効な文字を除去
     * @param {String} name - 元のファイル名
     * @return {String} 安全なファイル名
     */
    function cleanupFilename(name) {
        return name.replace(/[\/\?<>\\:\*\|":]/g, "");
    }

    /**
     * フレーム番号をパッド付きの文字列に変換
     * @param {Number} frameNum - フレーム番号
     * @param {Number} padLength - パッドする長さ（デフォルト3）
     * @return {String} パッド付きフレーム番号
     */
    function padFrameNumber(frameNum, padLength) {
        padLength = padLength || 3;
        var numStr = String(frameNum);
        while (numStr.length < padLength) {
            numStr = "0" + numStr;
        }
        return "f" + numStr;
    }

    //====================================
    // CompItemの拡張
    //====================================
    
    /**
     * PNG画像として保存する拡張メソッド
     * @param {File} fileObj - 保存先ファイルオブジェクト
     * @param {Array} res - 解像度係数 [横, 縦]
     * @return {Boolean} 成功したかどうか
     */
    CompItem.prototype.exportAsPNG = function(fileObj, res) {
        var currentRes = this.resolutionFactor;
        this.resolutionFactor = res;
        
        try {
            return this.saveFrameToPng(this.time, fileObj);
        } catch (err) {
            alert(err.toString());
            return false;
        } finally {
            this.resolutionFactor = currentRes;
        }
    };

    //====================================
    // メイン処理
    //====================================
    
    /**
     * スクリーンショット保存処理
     * @param {Number} resolutionOption - 解像度オプション
     * @param {Number} namingOption - 命名規則オプション
     * @param {String} outputPath - 出力先パス
     * @param {String} customPattern - カスタム命名パターン
     * @return {Boolean} 成功したかどうか
     */
    function processExport(resolutionOption, namingOption, outputPath, customPattern) {
        // アクティブなコンポジションを取得
        var activeComp = app.project.activeItem;
        
        // コンポジションチェック
        if (!(activeComp && activeComp instanceof CompItem)) {
            alert(localize(
                "Please select a composition first.",
                "コンポジションを選択してください。"
            ));
            return false;
        }
        
        // 出力先フォルダチェック
        var outputFolder = new Folder(outputPath);
        if (!outputFolder.exists) {
            alert(localize(
                "Output folder does not exist.",
                "出力先フォルダが存在しません。"
            ));
            return false;
        }
        
        // 解像度設定
        var resolutionFactor;
        switch (resolutionOption) {
            case 0: resolutionFactor = [1, 1]; break; // フル
            case 1: resolutionFactor = [2, 2]; break; // 1/2
            case 2: resolutionFactor = [3, 3]; break; // 1/3
            case 3: resolutionFactor = [4, 4]; break; // 1/4
            default: resolutionFactor = [1, 1];
        }
        
        // ファイル名の作成
        var baseFilename = cleanupFilename(activeComp.name);
        var frameNum = Math.floor((activeComp.time + activeComp.displayStartTime) * activeComp.frameRate);
        var timecodeStr = convertFrameToTimecode(frameNum, activeComp.frameRate);
        var filename;
        
        switch (namingOption) {
            case 0: // コンポジション名
                filename = baseFilename + EXTENSION;
                break;
            case 1: // コンポジション名 + フレーム番号 (fXXX形式)
                filename = baseFilename + "_" + padFrameNumber(frameNum) + EXTENSION;
                break;
            case 2: // コンポジション名 + タイムコード
                filename = baseFilename + "_" + timecodeStr.replace(/:/g, "-") + EXTENSION;
                break;
            case 3: // カスタム
                if (customPattern && customPattern.length > 0) {
                    // 変数置換
                    var customName = customPattern
                        .replace(/\${compName}/g, activeComp.name)
                        .replace(/\${frame}/g, frameNum.toString())
                        .replace(/\${tc}/g, timecodeStr);
                    filename = cleanupFilename(customName) + EXTENSION;
                } else {
                    filename = baseFilename + EXTENSION;
                }
                break;
            default:
                filename = baseFilename + EXTENSION;
        }
        
        // ファイルパスの作成
        var fullPath = outputPath + "/" + filename;
        var outputFile = new File(fullPath);
        
        // PNG保存処理
        app.beginUndoGroup(APP_NAME);
        try {
            if (activeComp.exportAsPNG(outputFile, resolutionFactor)) {
                alert(localize(
                    "Image saved to:\n" + fullPath,
                    "画像を保存しました:\n" + fullPath
                ));
                return true;
            }
        } catch (err) {
            alert(localize("Error: " + err.toString(), "エラー: " + err.toString()));
        } finally {
            app.endUndoGroup();
        }
        
        return false;
    }

    //====================================
    // UI構築
    //====================================
    
    /**
     * UIを構築して表示
     */
    function buildInterface(thisObj) {
        // メインウィンドウの作成
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", APP_NAME, undefined, {resizeable: true});

        if (win instanceof Panel) {
            win.text = APP_NAME;
        }
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 10;
        win.margins = UI_SIZES.MARGIN;
        
        // フォーマット
        var formatGroup = win.add("group");
        formatGroup.alignChildren = ["left", "center"];
        formatGroup.alignment = ["fill", "top"];
        formatGroup.orientation = "row";
        formatGroup.margins = UI_SIZES.GROUP_MARGIN;
        formatGroup.spacing = UI_SIZES.SPACING;
        
        var formatLabel = formatGroup.add("statictext", undefined, localize("Format:", "フォーマット:"));
        formatLabel.preferredSize.width = UI_SIZES.LABEL_WIDTH;
        
        var formatList = formatGroup.add("dropdownlist", undefined, ["PNG"]);
        formatList.alignment = ["fill", "center"];
        formatList.minimumSize = [UI_SIZES.DROPDOWN_WIDTH, UI_SIZES.CONTROL_HEIGHT];
        formatList.preferredSize.width = UI_SIZES.DROPDOWN_WIDTH;
        formatList.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        formatList.selection = 0;
        formatList.enabled = false;
        
        // 解像度
        var resolutionGroup = win.add("group");
        resolutionGroup.alignChildren = ["left", "center"];
        resolutionGroup.alignment = ["fill", "top"];
        resolutionGroup.orientation = "row";
        resolutionGroup.margins = UI_SIZES.GROUP_MARGIN;
        resolutionGroup.spacing = UI_SIZES.SPACING;
        
        var resolutionLabel = resolutionGroup.add("statictext", undefined, localize("Resolution:", "解像度:"));
        resolutionLabel.preferredSize.width = UI_SIZES.LABEL_WIDTH;
        
        var resolutionOptions = [
            localize("Full", "フル解像度"),
            localize("Half", "1/2解像度"),
            localize("Third", "1/3解像度"),
            localize("Quarter", "1/4解像度")
        ];
        
        var resolutionList = resolutionGroup.add("dropdownlist", undefined, resolutionOptions);
        resolutionList.alignment = ["fill", "center"];
        resolutionList.minimumSize = [UI_SIZES.DROPDOWN_WIDTH, UI_SIZES.CONTROL_HEIGHT];
        resolutionList.preferredSize.width = UI_SIZES.DROPDOWN_WIDTH;
        resolutionList.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        resolutionList.selection = parseInt(getUserPref("resolution", 0)) || 0;
        
        // ファイル名
        var namingGroup = win.add("group");
        namingGroup.alignChildren = ["left", "center"];
        namingGroup.alignment = ["fill", "top"];
        namingGroup.orientation = "row";
        namingGroup.margins = UI_SIZES.GROUP_MARGIN;
        namingGroup.spacing = UI_SIZES.SPACING;
        
        var namingLabel = namingGroup.add("statictext", undefined, localize("Naming:", "ファイル名:"));
        namingLabel.preferredSize.width = UI_SIZES.LABEL_WIDTH;
        
        var namingOptions = [
            localize("Composition Name", "コンポジション名"),
            localize("Composition Name + Frame", "コンポジション名 + フレーム番号"),
            localize("Composition Name + TC", "コンポジション名 + タイムコード"),
            localize("Custom", "カスタム")
        ];
        
        var namingList = namingGroup.add("dropdownlist", undefined, namingOptions);
        namingList.alignment = ["fill", "center"];
        namingList.minimumSize = [UI_SIZES.DROPDOWN_WIDTH, UI_SIZES.CONTROL_HEIGHT];
        namingList.preferredSize.width = UI_SIZES.DROPDOWN_WIDTH;
        namingList.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        namingList.selection = parseInt(getUserPref("naming", 0)) || 0;
        
        // カスタム
        var customGroup = win.add("group");
        customGroup.alignChildren = ["left", "center"];
        customGroup.alignment = ["fill", "top"];
        customGroup.orientation = "row";
        customGroup.margins = UI_SIZES.GROUP_MARGIN;
        customGroup.spacing = UI_SIZES.SPACING;
        customGroup.enabled = (namingList.selection.index === 3);
        
        var customLabel = customGroup.add("statictext", undefined, localize("Custom:", "カスタム:"));
        customLabel.preferredSize.width = UI_SIZES.LABEL_WIDTH;
        
        // カスタムフィールドは空欄に修正
        var customField = customGroup.add("edittext", undefined, "");
        customField.alignment = ["fill", "center"];
        customField.minimumSize = [UI_SIZES.EDIT_WIDTH, UI_SIZES.CONTROL_HEIGHT];
        customField.preferredSize.width = UI_SIZES.EDIT_WIDTH;
        customField.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        
        var helpButton = customGroup.add("button", undefined, "?");
        helpButton.preferredSize.width = UI_SIZES.SMALL_BTN_WIDTH;
        helpButton.preferredSize.height = UI_SIZES.SMALL_BTN_HEIGHT;
        
        // 出力先
        var outputGroup = win.add("group");
        outputGroup.alignChildren = ["left", "center"];
        outputGroup.alignment = ["fill", "top"];
        outputGroup.orientation = "row";
        outputGroup.margins = UI_SIZES.GROUP_MARGIN;
        outputGroup.spacing = UI_SIZES.SPACING;
        
        var outputLabel = outputGroup.add("statictext", undefined, localize("Export to:", "出力先:"));
        outputLabel.preferredSize.width = UI_SIZES.LABEL_WIDTH;
        
        // edittextに戻す（手入力・コピペ可能）
        var outputPath = outputGroup.add("edittext", undefined, getUserPref("path", Folder.desktop.fsName));
        outputPath.alignment = ["fill", "center"];
        outputPath.minimumSize = [UI_SIZES.EDIT_WIDTH, UI_SIZES.CONTROL_HEIGHT];
        outputPath.preferredSize.width = UI_SIZES.EDIT_WIDTH;
        outputPath.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        
        var browseButton = outputGroup.add("button", undefined, "🗀");
        browseButton.alignment = ["right", "center"];
        browseButton.preferredSize.width = UI_SIZES.SMALL_BTN_WIDTH;
        browseButton.preferredSize.height = UI_SIZES.SMALL_BTN_HEIGHT;
        
        // オプション
        var optionsGroup = win.add("group");
        optionsGroup.alignChildren = ["left", "center"];
        optionsGroup.alignment = ["fill", "top"];
        optionsGroup.orientation = "row";
        optionsGroup.margins = [UI_SIZES.LABEL_WIDTH + 10, 8, 0, 15];
        
        var autoCloseOption = optionsGroup.add("checkbox", undefined, 
            localize("Auto-close after export", "エクスポート後に閉じる"));
        autoCloseOption.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        autoCloseOption.value = (getUserPref("autoClose", "false") === "true");
        
        // ボタン
        var buttonGroup = win.add("group");
        buttonGroup.alignChildren = ["right", "center"];
        buttonGroup.alignment = ["fill", "top"];
        buttonGroup.orientation = "row";
        buttonGroup.margins = [0, 10, 15, 0];
        buttonGroup.spacing = 15;
        
        var exportButton = buttonGroup.add("button", undefined, localize("Export", "エクスポート"));
        exportButton.preferredSize.width = UI_SIZES.BIG_BTN_WIDTH;
        exportButton.preferredSize.height = UI_SIZES.BIG_BTN_HEIGHT;
        exportButton.active = false;
        
        var cancelButton = buttonGroup.add("button", undefined, localize("Cancel", "キャンセル"));
        cancelButton.preferredSize.width = UI_SIZES.BIG_BTN_WIDTH;
        cancelButton.preferredSize.height = UI_SIZES.BIG_BTN_HEIGHT;
        cancelButton.active = false;
        
        //====================================
        // イベントハンドラ
        //====================================
        
        // ファイル名ドロップダウン変更
        namingList.onChange = function() {
            customGroup.enabled = (this.selection.index === 3);
            saveUserPref("naming", this.selection.index);
        };
        
        // 解像度ドロップダウン変更
        resolutionList.onChange = function() {
            saveUserPref("resolution", this.selection.index);
        };
        
        // カスタムフィールド変更
        customField.onChange = function() {
            // カスタム名前の設定は保存しない（毎回リセットするため）
            // 変更イベントは残しておくが、saveUserPrefは呼び出さない
        };
        
        // 出力先パス変更
        outputPath.onChange = function() {
            saveUserPref("path", this.text);
        };
        
        // ヘルプボタン
        helpButton.onClick = function() {
            alert(localize(
                "Available tokens:\n\n${compName} - Composition Name\n${frame} - Frame Number\n${tc} - Timecode",
                "利用可能なトークン:\n\n${compName} - コンポジション名\n${frame} - フレーム番号\n${tc} - タイムコード"
            ));
        };
        
        // 参照ボタン
        browseButton.onClick = function() {
            var currentFolder = new Folder(outputPath.text);
            var selectedFolder = currentFolder.selectDlg(localize(
                "Select output folder",
                "出力先フォルダを選択"
            ));
            
            if (selectedFolder) {
                outputPath.text = selectedFolder.fsName; // edittextのtextプロパティを更新
                saveUserPref("path", selectedFolder.fsName);
            }
        };
        
        // キャンセルボタン
        cancelButton.onClick = function() {
            if (win instanceof Panel) {
                win.visible = false;
            } else {
                win.close();
            }
        };
        
        // エクスポートボタン
        exportButton.onClick = function() {
            saveUserPref("autoClose", autoCloseOption.value);
            
            var success = processExport(
                resolutionList.selection.index,
                namingList.selection.index,
                outputPath.text,
                customField.text
            );
            
            if (success && autoCloseOption.value && !(win instanceof Panel)) {
                win.close();
            }
        };
        
        // バージョン情報
        if (!(win instanceof Panel)) {
            var versionGroup = win.add("group");
            versionGroup.orientation = "row";
            versionGroup.alignChildren = ["right", "center"];
            versionGroup.alignment = ["fill", "top"];
            var versionText = versionGroup.add("statictext", undefined, "ver1.0.2");
            versionText.graphics.foregroundColor = versionText.graphics.newPen(versionText.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5], 1);
            versionText.graphics.font = ScriptUI.newFont("Arial", "Regular", 9);
        }

        win.layout.layout(true);
        win.layout.resize();
        if (!(win instanceof Panel)) {
            win.minimumSize = win.size;
        }

        win.onResizing = win.onResize = function() {
            this.layout.resize();
        };
        
        return win;
    }
    
    //====================================
    // メイン実行部
    //====================================

    var panel = buildInterface(thisObj);

    if (!app.project) {
        alert(localize(
            "Please open a project first.",
            "プロジェクトを開いてください。"
        ));
    }

    if (panel instanceof Window && !(panel instanceof Panel)) {
        panel.center();
        panel.show();
    }
})(this);
