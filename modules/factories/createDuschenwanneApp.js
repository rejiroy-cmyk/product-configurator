import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X } from './_shared.js';
import { createRelationalApp } from './createRelationalApp.js';

export function createDuschenwanneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, { enableGalleryUX: true, ...config });
}

