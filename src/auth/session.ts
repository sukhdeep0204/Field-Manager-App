import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@auth_token';
const STAFF_PROFILE_KEY = '@staff_profile';
const FARM_ACCESS_KEY = '@farm_access';
const FARM_DETAILS_KEY = '@farm_details';
const FARMER_DETAILS_KEY = '@farmer_details';

export type StaffProfile = {
  staff_id: string;
  staff_name: string;
  staff_department: string;
  staff_designation: string;
};

export type FarmAccess = {
  manager_id: string;
  assigned_zones: string[];
  block_ids: string[];
  farm_ids: string[];
  count: number;
};

export type FarmDetail = {
  farm: {
    created_at: string;
    area: number;
    harvest_log: Record<string, unknown>;
    land_data: {
      land_coordinates: number[][];
      farming_option: string;
      state: string;
      village: string;
      land_media: {
        images: string[];
        video: string;
      };
      district: string;
    };
    farmer_id: string;
    payment_log: Record<string, unknown>;
    farm_id: string;
    priority: number;
    block_id: string;
    crop_type: string;
  };
};

export type FarmerDetail = {
  farmer: {
    farmer_id: string;
    farmer_name: string;
    farmer_contact: string;
    farmer_alternate_contact: string;
    farming_option: string;
    farmer_address: string;
    kyc_data: Array<{
      adhar_number: string;
      pan_numnber: string;
      permanent_address: string;
      updated_at: string;
    }>;
  };
};

export async function saveSession(
  token: string,
  profile: StaffProfile,
  farmAccess: FarmAccess,
  farmDetails: FarmDetail[],
  farmerDetails: Record<string, FarmerDetail>,
) {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [STAFF_PROFILE_KEY, JSON.stringify(profile)],
    [FARM_ACCESS_KEY, JSON.stringify(farmAccess)],
    [FARM_DETAILS_KEY, JSON.stringify(farmDetails)],
    [FARMER_DETAILS_KEY, JSON.stringify(farmerDetails)],
  ]);
}

export async function loadSession() {
  const [token, profileJson, farmAccessJson, farmDetailsJson, farmerDetailsJson] = await AsyncStorage.multiGet([
    AUTH_TOKEN_KEY,
    STAFF_PROFILE_KEY,
    FARM_ACCESS_KEY,
    FARM_DETAILS_KEY,
    FARMER_DETAILS_KEY,
  ]);
  const savedToken = token[1];
  const savedProfile = profileJson[1];
  const savedFarmAccess = farmAccessJson[1];
  const savedFarmDetails = farmDetailsJson[1];
  const savedFarmerDetails = farmerDetailsJson[1];

  if (!savedToken || !savedProfile || !savedFarmAccess || !savedFarmDetails || !savedFarmerDetails) {
    return null;
  }

  try {
    return {
      token: savedToken,
      profile: JSON.parse(savedProfile) as StaffProfile,
      farmAccess: JSON.parse(savedFarmAccess) as FarmAccess,
      farmDetails: JSON.parse(savedFarmDetails) as FarmDetail[],
      farmerDetails: JSON.parse(savedFarmerDetails) as Record<string, FarmerDetail>,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove([
    AUTH_TOKEN_KEY,
    STAFF_PROFILE_KEY,
    FARM_ACCESS_KEY,
    FARM_DETAILS_KEY,
    FARMER_DETAILS_KEY,
  ]);
}
