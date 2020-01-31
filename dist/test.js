"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const files = [
    'Assets/Voiceer.meta',
    'Assets/Voiceer/VoiceResources.meta',
    'Assets/Voiceer/VoiceResources/MusubimeYuiVoices.meta',
    'Assets/Voiceer/VoiceResources/MusubimeYuiVoices/MusubimeYui.asset.meta',
];
const Run = () => {
    const path = "D:\\Saved Games\\Voiceer\\";
    const output = 'Voiceer+sample.unitypackage';
    index_1.default(files, path, output, console.log);
};
Run();
//# sourceMappingURL=test.js.map