/**
 * SaveSnap.jsx
 * @version 1.0.2
 * @author tatoutools
 * @description Tool for exporting the current composition frame to PNG
 */

(function(thisObj) {
    //====================================
    // Constants and configuration
    //====================================
    var APP_NAME = "SaveSnap";
    var CONFIG_SECTION = "SaveSnap";
    var EXTENSION = ".png";
    
    // UI size constants
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
    // Utility functions
    //====================================
    
    /**
     * Retrieve localized text based on the application language
     * @param {String} enText - English text
     * @param {String} jpText - Japanese text
     * @return {String} Localized text
     */
    function localize(enText, jpText) {
        return (app.language === Language.JAPANESE) ? jpText : enText;
    }
    
    /**
     * Persist a user preference
     * @param {String} key - Preference key
     * @param {any} value - Preference value
     */
    function saveUserPref(key, value) {
        app.settings.saveSetting(CONFIG_SECTION, key, value);
    }
    
    /**
     * Read a user preference
     * @param {String} key - Preference key
     * @param {any} defaultValue - Default value
     * @return {any} Stored preference value
     */
    function getUserPref(key, defaultValue) {
        if (!app.settings.haveSetting(CONFIG_SECTION, key)) {
            saveUserPref(key, defaultValue);
        }
        return app.settings.getSetting(CONFIG_SECTION, key);
    }
    
    /**
     * Convert a frame count to a timecode string
     * @param {Number} frameCount - Frame count
     * @param {Number} fps - Frame rate
     * @return {String} Timecode in hh:mm:ss:ff format
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
     * Remove invalid characters from file names
     * @param {String} name - Original file name
     * @return {String} Sanitized file name
     */
    function cleanupFilename(name) {
        return name.replace(/[\/\?<>\\:\*\|":]/g, "");
    }

    /**
     * Convert a frame number to a padded string
     * @param {Number} frameNum - Frame number
     * @param {Number} padLength - Length of padding (default: 3)
     * @return {String} Padded frame identifier
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
    // CompItem extensions
    //====================================
    
    /**
     * Save the current frame as a PNG image
     * @param {File} fileObj - Destination file object
     * @param {Array} res - Resolution factor [width, height]
     * @return {Boolean} Whether the export succeeded
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
    // Main processing
    //====================================
    
    /**
     * Export the current frame as a PNG file
     * @param {Number} resolutionOption - Resolution option index
     * @param {Number} namingOption - Naming option index
     * @param {String} outputPath - Output folder path
     * @param {String} customPattern - Custom naming pattern
     * @return {Boolean} Whether the export succeeded
     */
    function processExport(resolutionOption, namingOption, outputPath, customPattern) {
        // Fetch the active composition
        var activeComp = app.project.activeItem;
        
        // Validate composition selection
        if (!(activeComp && activeComp instanceof CompItem)) {
            alert(localize(
                "Please select a composition first.",
                "コンポジションを選択してください。"
            ));
            return false;
        }
        
        // Validate output folder
        var outputFolder = new Folder(outputPath);
        if (!outputFolder.exists) {
            alert(localize(
                "Output folder does not exist.",
                "出力先フォルダが存在しません。"
            ));
            return false;
        }
        
        // Determine resolution factor
        var resolutionFactor;
        switch (resolutionOption) {
            case 0: resolutionFactor = [1, 1]; break; // Full resolution
            case 1: resolutionFactor = [2, 2]; break; // Half resolution
            case 2: resolutionFactor = [3, 3]; break; // Third resolution
            case 3: resolutionFactor = [4, 4]; break; // Quarter resolution
            default: resolutionFactor = [1, 1];
        }
        
        // Build file name
        var baseFilename = cleanupFilename(activeComp.name);
        var frameNum = Math.floor((activeComp.time + activeComp.displayStartTime) * activeComp.frameRate);
        var timecodeStr = convertFrameToTimecode(frameNum, activeComp.frameRate);
        var filename;
        
        switch (namingOption) {
            case 0: // Composition name
                filename = baseFilename + EXTENSION;
                break;
            case 1: // Composition name + frame number (fXXX)
                filename = baseFilename + "_" + padFrameNumber(frameNum) + EXTENSION;
                break;
            case 2: // Composition name + timecode
                filename = baseFilename + "_" + timecodeStr.replace(/:/g, "-") + EXTENSION;
                break;
            case 3: // Custom naming
                if (customPattern && customPattern.length > 0) {
                    // Replace tokens
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
        
        // Build file path
        var fullPath = outputPath + "/" + filename;
        var outputFile = new File(fullPath);
        
        // Perform PNG export
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
    // UI construction
    //====================================
    
    /**
     * Build and display the UI
     */
    function buildInterface(thisObj) {
        // Create main window
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", APP_NAME, undefined, {resizeable: true});

        if (win instanceof Panel) {
            win.text = APP_NAME;
        }
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 10;
        win.margins = UI_SIZES.MARGIN;
        
        // Format selection
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
        
        // Resolution selection
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
        
        // Naming selection
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
        
        // Custom naming
        var customGroup = win.add("group");
        customGroup.alignChildren = ["left", "center"];
        customGroup.alignment = ["fill", "top"];
        customGroup.orientation = "row";
        customGroup.margins = UI_SIZES.GROUP_MARGIN;
        customGroup.spacing = UI_SIZES.SPACING;
        customGroup.enabled = (namingList.selection.index === 3);
        
        var customLabel = customGroup.add("statictext", undefined, localize("Custom:", "カスタム:"));
        customLabel.preferredSize.width = UI_SIZES.LABEL_WIDTH;
        
        // Keep custom field blank by default
        var customField = customGroup.add("edittext", undefined, "");
        customField.alignment = ["fill", "center"];
        customField.minimumSize = [UI_SIZES.EDIT_WIDTH, UI_SIZES.CONTROL_HEIGHT];
        customField.preferredSize.width = UI_SIZES.EDIT_WIDTH;
        customField.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        
        var helpButton = customGroup.add("button", undefined, "?");
        helpButton.preferredSize.width = UI_SIZES.SMALL_BTN_WIDTH;
        helpButton.preferredSize.height = UI_SIZES.SMALL_BTN_HEIGHT;
        
        // Output destination
        var outputGroup = win.add("group");
        outputGroup.alignChildren = ["left", "center"];
        outputGroup.alignment = ["fill", "top"];
        outputGroup.orientation = "row";
        outputGroup.margins = UI_SIZES.GROUP_MARGIN;
        outputGroup.spacing = UI_SIZES.SPACING;
        
        var outputLabel = outputGroup.add("statictext", undefined, localize("Export to:", "出力先:"));
        outputLabel.preferredSize.width = UI_SIZES.LABEL_WIDTH;
        
        // Use edittext to allow manual input and copy/paste
        var outputPath = outputGroup.add("edittext", undefined, getUserPref("path", Folder.desktop.fsName));
        outputPath.alignment = ["fill", "center"];
        outputPath.minimumSize = [UI_SIZES.EDIT_WIDTH, UI_SIZES.CONTROL_HEIGHT];
        outputPath.preferredSize.width = UI_SIZES.EDIT_WIDTH;
        outputPath.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        
        var browseButton = outputGroup.add("button", undefined, "🗀");
        browseButton.alignment = ["right", "center"];
        browseButton.preferredSize.width = UI_SIZES.SMALL_BTN_WIDTH;
        browseButton.preferredSize.height = UI_SIZES.SMALL_BTN_HEIGHT;
        
        // Options
        var optionsGroup = win.add("group");
        optionsGroup.alignChildren = ["left", "center"];
        optionsGroup.alignment = ["fill", "top"];
        optionsGroup.orientation = "row";
        optionsGroup.margins = [UI_SIZES.LABEL_WIDTH + 10, 8, 0, 15];
        
        var autoCloseOption = optionsGroup.add("checkbox", undefined, 
            localize("Auto-close after export", "エクスポート後に閉じる"));
        autoCloseOption.preferredSize.height = UI_SIZES.CONTROL_HEIGHT;
        autoCloseOption.value = (getUserPref("autoClose", "false") === "true");
        
        // Buttons
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
        // Event handlers
        //====================================
        
        // Naming dropdown change
        namingList.onChange = function() {
            customGroup.enabled = (this.selection.index === 3);
            saveUserPref("naming", this.selection.index);
        };
        
        // Resolution dropdown change
        resolutionList.onChange = function() {
            saveUserPref("resolution", this.selection.index);
        };
        
        // Custom field change
        customField.onChange = function() {
            // Do not persist custom naming because it resets each session
            // Keep the callback for validation but skip saveUserPref
        };
        
        // Output path change
        outputPath.onChange = function() {
            saveUserPref("path", this.text);
        };
        
        // Help button
        helpButton.onClick = function() {
            alert(localize(
                "Available tokens:\n\n${compName} - Composition Name\n${frame} - Frame Number\n${tc} - Timecode",
                "利用可能なトークン:\n\n${compName} - コンポジション名\n${frame} - フレーム番号\n${tc} - タイムコード"
            ));
        };
        
        // Browse button
        browseButton.onClick = function() {
            var currentFolder = new Folder(outputPath.text);
            var selectedFolder = currentFolder.selectDlg(localize(
                "Select output folder",
                "出力先フォルダを選択"
            ));
            
            if (selectedFolder) {
                outputPath.text = selectedFolder.fsName; // Update the edittext text property
                saveUserPref("path", selectedFolder.fsName);
            }
        };
        
        // Cancel button
        cancelButton.onClick = function() {
            if (win instanceof Panel) {
                win.visible = false;
            } else {
                win.close();
            }
        };
        
        // Export button
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
        
        // Version info
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
    // Entry point
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
