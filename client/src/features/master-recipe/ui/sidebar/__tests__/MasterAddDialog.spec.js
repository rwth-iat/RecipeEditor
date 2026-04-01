import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import flushPromises from 'flush-promises';

const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn()
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockClient)
  }
}));

import MasterAddDialog from '@/features/master-recipe/ui/sidebar/MasterAddDialog.vue';

function mountDialog() {
  return mount(MasterAddDialog, {
    props: {
      element_type: 'Procedures'
    }
  });
}

describe('MasterAddDialog', () => {
  beforeEach(() => {
    mockClient.get.mockReset();
    mockClient.post.mockReset();
    mockClient.delete.mockReset();
    mockClient.get.mockResolvedValue({ data: [] });
  });

  it('shows deterministic progress values and style at 100%', async () => {
    const wrapper = mountDialog();

    wrapper.vm.current_file_type = 'mtp';
    wrapper.vm.serverFiles = ['plant.mtp'];
    wrapper.vm.current_file_name = 'plant.mtp';
    wrapper.vm.isProcessingFile = true;

    wrapper.vm.initializeProgress(2);
    wrapper.vm.markParseDone();
    wrapper.vm.markProcedureLoaded();
    wrapper.vm.markProcedureLoaded();
    wrapper.vm.setProgressMessage('Loading procedures 2/2...');

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.progressCounterText).toBe('2/2');
    expect(wrapper.vm.progressPercent).toBe(100);

    const progressFill = wrapper.find('.progress-fill');
    expect(progressFill.exists()).toBe(true);
    expect(progressFill.attributes('style')).toContain('width: 100%');
  });

  it('imports MTP procedures and emits add payload', async () => {
    const wrapper = mountDialog();

    mockClient.get
      .mockResolvedValueOnce({
        data: {
          procs: [
            { name: 'Proc A', procId: '1', serviceId: 's1', selfCompleting: true, params: [] },
            { name: 'Proc B', procId: '2', serviceId: 's2', selfCompleting: false, params: [] }
          ]
        }
      })
      .mockResolvedValueOnce({ data: { equipment_data: { unit: 'E1' } } })
      .mockResolvedValueOnce({ data: { equipment_data: { unit: 'E2' } } });

    await wrapper.vm.addElementsFromFile('mtp', 'plant.mtp');

    const emitted = wrapper.emitted('add');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].title).toBe('plant');
    expect(emitted[0][0].items).toHaveLength(2);
    expect(emitted[0][0].items[0].equipmentInfo).toEqual({ equipment_data: { unit: 'E1' } });
    expect(emitted[0][0].items[1].equipmentInfo).toEqual({ equipment_data: { unit: 'E2' } });
  });

  it('continues MTP import when one equipment request fails', async () => {
    const wrapper = mountDialog();

    mockClient.get
      .mockResolvedValueOnce({
        data: {
          procs: [
            { name: 'Proc A', procId: '1', serviceId: 's1', selfCompleting: true, params: [] },
            { name: 'Proc B', procId: '2', serviceId: 's2', selfCompleting: false, params: [] }
          ]
        }
      })
      .mockRejectedValueOnce(new Error('equipment fetch failed'))
      .mockResolvedValueOnce({ data: { equipment_data: { unit: 'E2' } } });

    await wrapper.vm.addElementsFromFile('mtp', 'plant.mtp');

    const emitted = wrapper.emitted('add');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].items).toHaveLength(2);
    expect(emitted[0][0].items[0].equipmentInfo).toBeNull();
    expect(emitted[0][0].items[1].equipmentInfo).toEqual({ equipment_data: { unit: 'E2' } });
  });

  it('imports AAS capabilities and emits add payload', async () => {
    const wrapper = mountDialog();

    mockClient.get
      .mockResolvedValueOnce({
        data: [
          {
            capability: [{ capability_name: 'Cap A' }],
            realized_by: ['Service A']
          },
          {
            capability: [{ capability_name: 'Cap B' }],
            realized_by: ['Service B']
          },
          {
            capability: [{ capability_name: 'Skipped' }],
            realized_by: []
          }
        ]
      })
      .mockResolvedValueOnce({ data: { equipment_data: { source: 'AAS' } } });

    await wrapper.vm.addElementsFromFile('aas', 'robot.xml');

    const emitted = wrapper.emitted('add');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].title).toBe('robot');
    expect(emitted[0][0].items).toHaveLength(2);
    expect(emitted[0][0].items[0].name).toBe('Cap A');
    expect(emitted[0][0].items[1].name).toBe('Cap B');
  });

  it('disables controls while processing', async () => {
    const wrapper = mountDialog();

    wrapper.vm.current_file_type = 'mtp';
    wrapper.vm.serverFiles = ['plant.mtp'];
    wrapper.vm.current_file_name = 'plant.mtp';
    wrapper.vm.isProcessingFile = true;
    wrapper.vm.setProgressMessage('Parsing file...');

    await wrapper.vm.$nextTick();

    expect(wrapper.find('#fileTypeSelect').attributes('disabled')).toBeDefined();
    expect(wrapper.find('button.dialog-header-icon-btn').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#file_select').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#add_elements_button').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.uploader-section input[type="file"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.uploader-section button.button').attributes('disabled')).toBeDefined();
  });

  it('deletes the selected MTP file via the server API', async () => {
    mockClient.get.mockImplementation((url) => {
      if (url === '/mtp') {
        const callCount = mockClient.get.mock.calls.filter(([path]) => path === '/mtp').length;
        return Promise.resolve({ data: callCount === 1 ? ['plant.mtp'] : [] });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    mockClient.delete.mockResolvedValueOnce({
      data: {
        message: 'MTP file deleted successfully.',
        filename: 'plant.mtp',
        fileType: 'mtp',
      },
    });

    const wrapper = mountDialog();
    await flushPromises();

    expect(wrapper.vm.current_file_name).toBe('plant.mtp');

    await wrapper.find('button.dialog-delete-btn').trigger('click');
    await flushPromises();

    expect(mockClient.delete).toHaveBeenCalledWith('/mtp/plant.mtp');
    expect(wrapper.vm.current_file_name).toBe('');
    expect(wrapper.text()).toContain('MTP file deleted successfully.');
  });
});
