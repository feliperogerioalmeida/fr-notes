import type { AuthDictionary } from "@workspace/auth/types";

export interface NotFoundLabels {
  title: string;
  description: string;
  backButton: string;
}

export interface ErrorLabels {
  title: string;
  description: string;
  retryButton: string;
  backButton: string;
}

export interface CommonDictionary {
  notFound: NotFoundLabels;
  error: ErrorLabels;
}

export interface HomeDictionary {
  title: string;
}

export interface Dictionary {
  common: CommonDictionary;
  home: HomeDictionary;
  auth: AuthDictionary;
}
