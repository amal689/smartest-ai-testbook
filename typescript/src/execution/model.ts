export interface Model {
  readonly providerName: string;
  readonly modelName: string;
  generateResponse(
    prompt: string,
    variables: Readonly<Record<string, string>>,
  ): Promise<string>;
}

export interface ModelProvider {
  getModel(modelName: string): Model;
}
