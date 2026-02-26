export type MockupMode = 'all' | 'images_only' | 'videos_only' | 'none';

export type AssetType = 'image' | 'video';

export interface Asset {
  type: AssetType;
  path: string;
}

export interface MockupConfig {
  mode: MockupMode;
}
