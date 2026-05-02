import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { StreamableFile } from '@nestjs/common';

import { SubmissionsController } from '../submissions.controller';

describe('SubmissionsController', () => {
  let submissionsService: any;
  let controller: SubmissionsController;

  beforeEach(() => {
    submissionsService = {
      create: jest.fn(),
      update: jest.fn(),
      submit: jest.fn(),
      getUserSubmissions: jest.fn(),
      getAllSubmissions: jest.fn(),
      downloadSubmissionFile: jest.fn(),
      getPublicUrl: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    controller = new SubmissionsController(submissionsService as any);
  });

  it('should create, update, submit and list submissions', async () => {
    submissionsService.create.mockResolvedValue({ id: 'submission-1' });
    submissionsService.update.mockResolvedValue({ id: 'submission-1', updated: true });
    submissionsService.submit.mockResolvedValue({ id: 'submission-1', submitted: true });
    submissionsService.getUserSubmissions.mockResolvedValue([{ id: 'submission-1' }]);
    submissionsService.getAllSubmissions.mockResolvedValue([{ id: 'submission-2' }]);
    submissionsService.getPublicUrl.mockResolvedValue({ url: 'https://viewer.example' });
    submissionsService.findOne.mockResolvedValue({ id: 'submission-1' });
    submissionsService.delete.mockResolvedValue(undefined);

    await expect(controller.create({} as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'submission-1' });
    await expect(controller.update('submission-1', {} as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'submission-1', updated: true });
    await expect(controller.submit('submission-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'submission-1', submitted: true });
    await expect(controller.getMySubmissions({ user: { id: 'user-1' } } as any, 'template-1')).resolves.toEqual([{ id: 'submission-1' }]);
    await expect(controller.getAllSubmissions('template-1')).resolves.toEqual([{ id: 'submission-2' }]);
    await expect(controller.getPublicUrl('submission-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ url: 'https://viewer.example' });
    await expect(controller.findOne('submission-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'submission-1' });
    await expect(controller.delete('submission-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ message: 'Submission deleted successfully' });
  });

  it('should download a submission file and set headers', async () => {
    submissionsService.downloadSubmissionFile.mockResolvedValue({
      fileName: 'my document.docx',
      buffer: Buffer.from('content'),
    });
    const response = { set: jest.fn() } as any;

    const result = await controller.downloadFile('submission-1', { user: { id: 'user-1' } } as any, response);

    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="my%20document.docx"',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
