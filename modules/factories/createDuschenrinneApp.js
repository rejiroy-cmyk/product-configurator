import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X } from './_shared.js';
import { createRelationalApp } from './createRelationalApp.js';

export function createDuschenrinneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, {
        montageLabel1: 'Wand',
        montageLabel2: 'Raum',
        sizeLabel: 'Breite',
        hideForm: true,
        hideManualSizeInputs: true,
        enableGalleryUX: true,
        ...config
    });
}

