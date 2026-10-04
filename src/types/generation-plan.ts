export type CreateFileChange = {
  operation: 'create';
  relativePath: string;
  content: string;
};

export type UpdateFileChange = {
  operation: 'update';
  relativePath: string;
  expectedContent: string;
  content: string;
};

export type GenerationFileChange = CreateFileChange | UpdateFileChange;

export type GenerationPlan = {
  projectRoot: string;
  changes: GenerationFileChange[];
};
