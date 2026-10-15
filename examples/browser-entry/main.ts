import { enforceScriptIntegrity, type SRIConfig } from '@nithin93/sri-js/browser';

const config: SRIConfig = { 'app.js': 'sha384-replace-with-your-build-hash' };
enforceScriptIntegrity(config, '/assets/');
const script = document.createElement('script');
script.src = '/assets/app.js';
document.body.dataset.integrity = script.integrity;
