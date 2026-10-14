import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { packingMaterialService } from '../services';

export function usePackingMaterials() {
  return useQuery({
    queryKey: queryKeys.packingMaterials(),
    queryFn: () => packingMaterialService.listPackingMaterials(),
  });
}
