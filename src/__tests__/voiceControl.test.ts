import { describe, test, expect } from 'bun:test';
import {
  createChannelSettingsModal,
  createVoiceChannelControls,
} from '../components/VoiceChannelComponents';
import { ButtonStyle } from 'discord.js';

describe('VoiceChannelComponents', () => {
  test('createVoiceChannelControls creates correct number of buttons', () => {
    const controls = createVoiceChannelControls();
    expect(controls.components).toHaveLength(4);
  });

  test('createChannelSettingsModal handles null channel name', () => {
    const modal = createChannelSettingsModal(null, 0);
    const components = modal.components;

    expect(components).toHaveLength(4);
    const nameInput = components[0].components[0];
    expect(nameInput.data.value).toBe('Temporärer Kanal');
  });

  test('createChannelSettingsModal uses provided channel name', () => {
    const testName = 'Test Channel';
    const modal = createChannelSettingsModal(testName, 0);
    const components = modal.components;

    expect(components).toHaveLength(4);
    const nameInput = components[0].components[0];
    expect(nameInput.data.value).toBe(testName);
  });

  test('createChannelSettingsModal sets correct user limit', () => {
    const modal = createChannelSettingsModal('Test', 5);
    const components = modal.components;
    const limitInput = components[1].components[0];
    expect(limitInput.data.value).toBe('5');
  });
});
