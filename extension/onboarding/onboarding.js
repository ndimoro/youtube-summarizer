// Onboarding wizard for TL;DW extension

// Provider configurations
const PROVIDER_CONFIG = {
  anthropic: {
    name: 'Anthropic',
    label: 'Anthropic API Key',
    placeholder: 'sk-ant-api03-...',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    validatePrefix: 'sk-ant-'
  },
  openai: {
    name: 'OpenAI',
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    consoleUrl: 'https://platform.openai.com/api-keys',
    validatePrefix: 'sk-'
  },
  google: {
    name: 'Google',
    label: 'Google API Key',
    placeholder: 'AIza...',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    validatePrefix: null // Google keys have varied formats
  }
};

// State
let currentStep = 1;
let selectedProvider = null;

// DOM Elements
const progressDots = document.querySelectorAll('.progress-dot');
const steps = document.querySelectorAll('.step');
const providerCards = document.querySelectorAll('.provider-card');
const apiKeyInput = document.getElementById('api-key');
const apiKeyLabel = document.getElementById('api-key-label');
const apiKeyLink = document.getElementById('api-key-link');
const providerNameSpan = document.getElementById('provider-name');
const errorMessage = document.getElementById('error-message');
const btnGetStarted = document.getElementById('btn-get-started');
const btnBack = document.getElementById('btn-back');
const btnContinue = document.getElementById('btn-continue');
const btnFinish = document.getElementById('btn-finish');

// Check if already onboarded
async function checkOnboardingStatus() {
  const result = await chrome.storage.sync.get(['onboardingCompleted', 'apiKey']);
  if (result.onboardingCompleted && result.apiKey) {
    // Already completed, redirect to options
    chrome.runtime.openOptionsPage();
  }
}

// Initialize
checkOnboardingStatus();

// Navigate to step
function goToStep(step) {
  currentStep = step;

  // Update progress dots
  progressDots.forEach(dot => {
    const dotStep = parseInt(dot.dataset.step);
    dot.classList.remove('active', 'completed');
    if (dotStep === currentStep) {
      dot.classList.add('active');
    } else if (dotStep < currentStep) {
      dot.classList.add('completed');
    }
  });

  // Show current step
  steps.forEach(stepEl => {
    stepEl.classList.remove('active');
    if (parseInt(stepEl.dataset.step) === currentStep) {
      stepEl.classList.add('active');
    }
  });

  // Focus management for accessibility
  if (currentStep === 3) {
    setTimeout(() => apiKeyInput.focus(), 100);
  }
}

// Select provider
function selectProvider(provider) {
  selectedProvider = provider;
  const config = PROVIDER_CONFIG[provider];

  // Update UI for step 3
  providerNameSpan.textContent = config.name;
  apiKeyLabel.textContent = config.label;
  apiKeyInput.placeholder = config.placeholder;
  apiKeyLink.href = config.consoleUrl;
  apiKeyInput.value = '';
  btnContinue.disabled = true;
  hideError();

  // Go to step 3
  goToStep(3);
}

// Validate API key format
function validateApiKey(key) {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'Please enter an API key' };
  }

  const config = PROVIDER_CONFIG[selectedProvider];

  // Check prefix for providers that have one
  if (config.validatePrefix && !key.startsWith(config.validatePrefix)) {
    return {
      valid: false,
      error: `${config.name} API keys should start with "${config.validatePrefix}"`
    };
  }

  // Basic length check
  if (key.length < 20) {
    return { valid: false, error: 'API key seems too short' };
  }

  return { valid: true };
}

// Show error
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

// Hide error
function hideError() {
  errorMessage.classList.remove('show');
}

// Save settings
async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();

  const validation = validateApiKey(apiKey);
  if (!validation.valid) {
    showError(validation.error);
    return false;
  }

  try {
    await chrome.storage.sync.set({
      apiKey: apiKey,
      aiProvider: selectedProvider,
      onboardingCompleted: true
    });
    return true;
  } catch (error) {
    showError('Failed to save settings. Please try again.');
    return false;
  }
}

// Event Listeners

// Step 1: Get Started button
btnGetStarted.addEventListener('click', () => {
  goToStep(2);
});

// Step 2: Provider selection
providerCards.forEach(card => {
  card.addEventListener('click', () => {
    selectProvider(card.dataset.provider);
  });

  // Keyboard support
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectProvider(card.dataset.provider);
    }
  });
});

// Step 3: API key input
apiKeyInput.addEventListener('input', () => {
  const key = apiKeyInput.value.trim();
  btnContinue.disabled = key.length < 10;
  hideError();
});

// Handle Enter key in input
apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !btnContinue.disabled) {
    btnContinue.click();
  }
});

// Step 3: Back button
btnBack.addEventListener('click', () => {
  goToStep(2);
});

// Step 3: Continue button
btnContinue.addEventListener('click', async () => {
  const saved = await saveSettings();
  if (saved) {
    goToStep(4);
  }
});

// Step 4: Finish button
btnFinish.addEventListener('click', () => {
  // Open YouTube and close the onboarding tab
  chrome.tabs.create({ url: 'https://www.youtube.com' });
  window.close();
});
