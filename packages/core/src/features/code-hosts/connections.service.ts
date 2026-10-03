import { inject, singleton } from 'tsyringe';

import { CODE_HOST_DEFAULT_URLS, CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { CONNECTION_REPOSITORY_TOKEN, CORE_HOST_TOKEN } from '@~/di/tokens';
import type { iCoreHost } from '@~/host/core-host.types';
import { ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { normalizeBaseUrl } from './code-host-http';
import type { iCodeHostProvider, iConnectionRecord, iConnectionResponse } from './code-hosts.types';
import type { iConnectionRepository } from './connection.repository';
import { GitHubProvider } from './github.provider';
import { GitLabProvider } from './gitlab.provider';

const secretKey = (connectionId: string) => `connection:${connectionId}`;

function toResponse({ id, host, baseUrl, username, createdAt }: iConnectionRecord): iConnectionResponse {
  return { id, host, baseUrl, username, createdAt };
}

/**
 * GitLab and GitHub accounts. A token is checked against the host before it is kept, kept only in the
 * host's encrypted store, and never returned to the renderer.
 */
@singleton()
export class ConnectionsService {
  constructor(
    @inject(CONNECTION_REPOSITORY_TOKEN) private readonly connectionRepository: iConnectionRepository,
    @inject(CORE_HOST_TOKEN) private readonly host: iCoreHost,
    private readonly gitLabProvider: GitLabProvider,
    private readonly gitHubProvider: GitHubProvider,
  ) {}

  public async list() {
    return (await this.connectionRepository.list()).map(toResponse);
  }

  public async listRecords() {
    return this.connectionRepository.list();
  }

  /** Adds an account, or replaces the token of the one already added for the same address. */
  public async add(input: { host: CodeHost; baseUrl?: string; token: string }) {
    if (!this.host.secrets.isAvailable()) throw ORPCUnprocessableContentError(errorCodes.SECRETS_UNAVAILABLE);
    const baseUrl = normalizeBaseUrl(input.baseUrl?.trim() ? input.baseUrl : CODE_HOST_DEFAULT_URLS.get(input.host));
    const token = input.token.trim();
    const { username } = await this.providerFor(input.host).currentUser({ baseUrl, token });
    if (!username) throw ORPCUnprocessableContentError(errorCodes.CONNECTION_REJECTED);

    const existing = (await this.connectionRepository.list()).find(
      (connection) => connection.host === input.host && connection.baseUrl === baseUrl,
    );
    const connection = existing
      ? await this.connectionRepository.update(existing.id, { username })
      : await this.connectionRepository.create({ host: input.host, baseUrl, username });
    if (!connection) throw ORPCNotFoundError(errorCodes.CONNECTION_NOT_FOUND);
    await this.host.secrets.write(secretKey(connection.id), token);
    return toResponse(connection);
  }

  public async remove(connectionId: string) {
    await this.getRecord(connectionId);
    await this.host.secrets.remove(secretKey(connectionId));
    return { isRemoved: await this.connectionRepository.delete(connectionId) };
  }

  public async getRecord(connectionId: string) {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) throw ORPCNotFoundError(errorCodes.CONNECTION_NOT_FOUND);
    return connection;
  }

  /** The provider and credentials for calling the connection's host. */
  public async access(connection: iConnectionRecord) {
    const token = await this.host.secrets.read(secretKey(connection.id));
    if (!token) throw ORPCUnprocessableContentError(errorCodes.CONNECTION_REJECTED);
    return { provider: this.providerFor(connection.host), access: { baseUrl: connection.baseUrl, token } };
  }

  public providerFor(host: CodeHost): iCodeHostProvider {
    return host === CODE_HOSTS.GITHUB ? this.gitHubProvider : this.gitLabProvider;
  }
}
