import indexContract from './contract/index.contract';

export const CONTRACT = {
  index: indexContract,
};

export type AppContract = typeof CONTRACT;

export default CONTRACT;
