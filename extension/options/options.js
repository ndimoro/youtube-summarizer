// Options page script for managing settings

const form = document.getElementById('settings-form');
const providerSelect = document.getElementById('ai-provider');
const apiKeyInput = document.getElementById('api-key');
const apiKeyLabel = document.getElementById('api-key-label');
const apiKeyHelp = document.getElementById('api-key-help');
const apiKeyLink = document.getElementById('api-key-link');
const toggleVisibilityBtn = document.getElementById('toggle-visibility');
const statusMessage = document.getElementById('status-message');

// Integration settings elements
const obsidianVaultInput = document.getElementById('obsidian-vault');
const obsidianFolderInput = document.getElementById('obsidian-folder');
const obsidianEmbedCheckbox = document.getElementById('obsidian-embed');
const saveIntegrationsBtn = document.getElementById('save-integrations');
const integrationStatusMessage = document.getElementById('integration-status');

// Provider configurations
const providerConfigs = {
  anthropic: {
    name: 'Anthropic',
    keyLabel: 'Anthropic API Key',
    placeholder: 'sk-ant-api03-...',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleName: 'Anthropic Console',
    keyPrefix: 'sk-ant-'
  },
  openai: {
    name: 'OpenAI',
    keyLabel: 'OpenAI API Key',
    placeholder: 'sk-proj-...',
    consoleUrl: 'https://platform.openai.com/api-keys',
    consoleName: 'OpenAI Platform',
    keyPrefix: 'sk-'
  },
  google: {
    name: 'Google',
    keyLabel: 'Google AI API Key',
    placeholder: 'AIza...',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    consoleName: 'Google AI Studio',
    keyPrefix: 'AIza'
  }
};

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadIntegrationSettings();
});

// Save settings when form is submitted
form.addEventListener('submit', saveSettings);

// Toggle API key visibility
toggleVisibilityBtn.addEventListener('click', toggleApiKeyVisibility);

// Update UI when provider changes
providerSelect.addEventListener('change', () => {
  const newProvider = providerSelect.value;
  const config = providerConfigs[newProvider];
  const currentKey = apiKeyInput.value.trim();

  // If there's a key that doesn't match the new provider, clear it
  if (currentKey && !currentKey.startsWith(config.keyPrefix)) {
    apiKeyInput.value = '';
    showStatus(`Provider changed. Please enter your ${config.name} API key.`, 'error');
  }

  updateProviderUI();
});

function updateProviderUI() {
  const provider = providerSelect.value;
  const config = providerConfigs[provider];

  // Update label and placeholder
  apiKeyLabel.textContent = config.keyLabel;
  apiKeyInput.placeholder = config.placeholder;

  // Update help text
  apiKeyLink.href = config.consoleUrl;
  apiKeyLink.textContent = config.consoleName;
}

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['aiProvider', 'apiKey', 'anthropicApiKey']);

    // Set provider (default to anthropic)
    if (result.aiProvider) {
      providerSelect.value = result.aiProvider;
    }

    // Update UI for selected provider
    updateProviderUI();

    // Set API key - check new key first, fall back to old key for migration
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    } else if (result.anthropicApiKey) {
      // Fallback to old key if new key doesn't exist (migration case)
      apiKeyInput.value = result.anthropicApiKey;
      providerSelect.value = 'anthropic';
      updateProviderUI();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const config = providerConfigs[provider];

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  // Validate API key format based on provider
  let isValidFormat = apiKey.startsWith(config.keyPrefix);

  // Special case: OpenAI keys start with 'sk-' but should NOT match Anthropic 'sk-ant-'
  if (provider === 'openai' && apiKey.startsWith('sk-ant-')) {
    isValidFormat = false;
  }

  if (!isValidFormat) {
    showStatus(`Invalid API key format. ${config.name} API keys start with "${config.keyPrefix}"`, 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({
      aiProvider: provider,
      apiKey: apiKey
    });
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

function toggleApiKeyVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleVisibilityBtn.textContent = 'Hide';
  } else {
    apiKeyInput.type = 'password';
    toggleVisibilityBtn.textContent = 'Show';
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;

  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 3000);
  }
}

// ============================================
// Integration Settings
// ============================================

// Save integrations button click handler
saveIntegrationsBtn.addEventListener('click', saveIntegrationSettings);

async function loadIntegrationSettings() {
  try {
    const result = await chrome.storage.sync.get(['obsidianSettings']);

    // Load Obsidian settings
    if (result.obsidianSettings) {
      if (result.obsidianSettings.vaultName) {
        obsidianVaultInput.value = result.obsidianSettings.vaultName;
      }
      if (result.obsidianSettings.folderPath) {
        obsidianFolderInput.value = result.obsidianSettings.folderPath;
      }
      obsidianEmbedCheckbox.checked = result.obsidianSettings.includeEmbed !== false;
    }
  } catch (error) {
    console.error('Error loading integration settings:', error);
  }
}

async function saveIntegrationSettings() {
  try {
    const obsidianSettings = {
      vaultName: obsidianVaultInput.value.trim(),
      folderPath: obsidianFolderInput.value.trim() || 'YouTube Summaries',
      includeEmbed: obsidianEmbedCheckbox.checked,
      calloutType: 'tip'
    };

    await chrome.storage.sync.set({
      obsidianSettings
    });

    showIntegrationStatus('Integration settings saved!', 'success');
  } catch (error) {
    console.error('Error saving integration settings:', error);
    showIntegrationStatus('Failed to save integration settings', 'error');
  }
}

function showIntegrationStatus(message, type) {
  integrationStatusMessage.textContent = message;
  integrationStatusMessage.className = `status-message show ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      integrationStatusMessage.classList.remove('show');
    }, 3000);
  }
}
