import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import { FINDING_REPOSITORY_TOKEN, PREFERENCE_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iFindingRepository } from '@~/features/findings/finding.repository';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { preferencesSnippet } from './preference-format.utils';
import type { iPreferenceRepository } from './preference.repository';
import type { iPreferenceRecord } from './preferences.types';

/** Project preferences: stated by the reviewer, per repository, and handed to agents with every digest and prompt. */
@singleton()
export class PreferencesService {
  constructor(
    @inject(PREFERENCE_REPOSITORY_TOKEN) private readonly preferenceRepository: iPreferenceRepository,
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    private readonly workspacesService: WorkspacesService,
  ) {}

  public async list(workspaceId: string) {
    await this.workspacesService.getRecord(workspaceId);
    return this.withNumbers(workspaceId, await this.preferenceRepository.list(workspaceId));
  }

  /** The texts alone, for prompts. */
  public async texts(workspaceId: string) {
    return (await this.preferenceRepository.list(workspaceId)).map((preference) => preference.text);
  }

  public async create(input: { workspaceId: string; text: string; findingId?: string }) {
    await this.workspacesService.getRecord(input.workspaceId);
    if (input.findingId) {
      const finding = await this.findingRepository.findById(input.findingId);
      if (finding?.workspaceId !== input.workspaceId) throw ORPCNotFoundError(errorCodes.FINDING_NOT_FOUND);
    }
    const created = await this.preferenceRepository.create({
      workspaceId: input.workspaceId,
      text: input.text,
      findingId: input.findingId ?? null,
    });
    return this.one(created);
  }

  public async update(preferenceId: string, text: string) {
    await this.getRecord(preferenceId);
    const updated = await this.preferenceRepository.update(preferenceId, text);
    if (!updated) throw ORPCNotFoundError(errorCodes.PREFERENCE_NOT_FOUND);
    return this.one(updated);
  }

  public async remove(preferenceId: string) {
    await this.getRecord(preferenceId);
    await this.preferenceRepository.remove(preferenceId);
    return { preferenceId };
  }

  public async snippet(workspaceId: string) {
    await this.workspacesService.getRecord(workspaceId);
    const texts = await this.texts(workspaceId);
    return { markdown: preferencesSnippet(texts), count: texts.length };
  }

  private async getRecord(preferenceId: string) {
    const preference = await this.preferenceRepository.findById(preferenceId);
    if (!preference) throw ORPCNotFoundError(errorCodes.PREFERENCE_NOT_FOUND);
    return preference;
  }

  private async one(preference: iPreferenceRecord) {
    const [response] = await this.withNumbers(preference.workspaceId, [preference]);
    return response;
  }

  private async withNumbers(workspaceId: string, preferences: iPreferenceRecord[]) {
    const hasFindings = preferences.some((preference) => preference.findingId);
    const numbers = hasFindings
      ? new Map((await this.findingRepository.list({ workspaceId })).map((finding) => [finding.id, finding.number]))
      : new Map<string, number>();
    return preferences.map((preference) => ({
      ...preference,
      findingNumber: preference.findingId ? numbers.get(preference.findingId) : undefined,
    }));
  }
}
