export interface FrameworkConfiguration {
  projectMetadata: {
    clientName: string;
    applicationName: string;
    targetEnvironment: 'localhost' | 'dev' | 'qa' | 'staging' | 'prod';
  };
  modules: {
    authSession: {
      enabled: boolean;
      sessionTtlMinutes: number;
      autoReloginOnExpiry: boolean;
    };
    networkMocking: {
      enabled: boolean;
      blockHeavyAssets: boolean;
      mockThirdPartyApis: boolean;
    };
    visualTesting: {
      enabled: boolean;
      maxDiffPixelRatio: number;
      maskDynamicLocators: string[];
    };
    accessibility: {
      enabled: boolean;
      wcagStandard: 'WCAG2AA' | 'WCAG21AA';
      autoLogToRecommendations: boolean;
    };
    cloudStorage: {
      provider: 'AWS_S3' | 'LOCAL_FIXTURES';
      bucketNameEnvVar: string;
    };
    notifications: {
      provider: 'SLACK' | 'MS_TEAMS' | 'DISABLED';
      triggerCondition: 'ON_FAILURE_ONLY' | 'ALWAYS' | 'NEVER';
    };
    flakyQuarantine: {
      enabled: boolean;
      maxRetries: number;
    };
  };
}

export const activeFrameworkConfig: FrameworkConfiguration = {
  projectMetadata: {
    clientName: process.env.CLIENT_NAME || 'Default Enterprise Client',
    applicationName: process.env.APPLICATION_NAME || 'Core Web Platform',
    targetEnvironment: (process.env.ENV as any) || 'qa',
  },
  modules: {
    authSession: {
      enabled: true,
      sessionTtlMinutes: 60,
      autoReloginOnExpiry: true,
    },
    networkMocking: {
      enabled: false,
      blockHeavyAssets: false,
      mockThirdPartyApis: false,
    },
    visualTesting: {
      enabled: false,
      maxDiffPixelRatio: 0.05,
      maskDynamicLocators: ['time', '.order-timestamp', '.live-badge'],
    },
    accessibility: {
      enabled: true,
      wcagStandard: 'WCAG21AA',
      autoLogToRecommendations: true,
    },
    cloudStorage: {
      provider: 'LOCAL_FIXTURES',
      bucketNameEnvVar: 'AWS_S3_BUCKET_NAME',
    },
    notifications: {
      provider: 'DISABLED',
      triggerCondition: 'ON_FAILURE_ONLY',
    },
    flakyQuarantine: {
      enabled: true,
      maxRetries: 2,
    },
  },
};
