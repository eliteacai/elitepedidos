import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PDVProduct, PDVSale, PDVSaleItem, PDVOperator, PDVCartItem } from '../types/pdv';
import { usePDVCashRegister } from './usePDVCashRegister';

export const usePDVProducts = () => {
  const [products, setProducts] = useState<PDVProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('pdv_products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts
  };
};

export const usePDVOperators = () => {
  const [operators, setOperators] = useState<PDVOperator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOperators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('pdv_operators')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setOperators(data || []);
    } catch (err) {
      console.error('Error fetching operators:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar operadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  return {
    operators,
    loading,
    error,
    refetch: fetchOperators
  };
};

export const usePDVSales = () => {
  const [sales, setSales] = useState<PDVSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentRegister, isOpen: isCashRegisterOpen } = usePDVCashRegister();

  const createSale = useCallback(async (
    saleData: Omit<PDVSale, 'id' | 'sale_number' | 'created_at' | 'updated_at'>,
    items: Omit<PDVSaleItem, 'id' | 'sale_id' | 'created_at'>[],
    debug = false
  ) => {
    try {
      setLoading(true);
      
      // Check if cash register is open
      if (!isCashRegisterOpen || !currentRegister) {
        console.error('❌ Não é possível finalizar venda sem um caixa aberto');
        throw new Error('Não é possível finalizar venda sem um caixa aberto');
      }

      // Set channel to pdv if not specified
      const saleWithChannel = {
        ...saleData,
        channel: saleData.channel || 'pdv'
      };
      
      // Associate with current cash register
      saleWithChannel.cash_register_id = currentRegister.id;
      
      if (debug) {
        console.log('🔍 Sale data:', saleWithChannel);
        console.log('🔍 Sale items:', items);
      }

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('pdv_sales')
        .insert([saleWithChannel])
        .select()
        .single();

      if (saleError) {
        console.error('❌ Sale creation error:', saleError);
        throw saleError;
      }

      if (debug) {
        console.log('✅ Sale created:', sale);
      }

      // Create sale items
      const saleItems = items.map(item => ({
        ...item,
        sale_id: sale.id
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('pdv_sale_items')
        .insert(saleItems)
        .select();

      if (itemsError) {
        console.error('❌ Sale items creation error:', itemsError);
        // Try to rollback the sale
        await supabase
          .from('pdv_sales')
          .delete()
          .eq('id', sale.id);
        throw itemsError;
      }

      if (debug) {
        console.log('✅ Sale items created:', createdItems);
      }

      // Return complete sale with items
      const completeSale = {
        ...sale,
        items: createdItems
      };

      if (debug) {
        console.log('✅ Complete sale:', completeSale);
      }

      return completeSale;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar venda';
      setError(errorMessage);
      console.error('❌ Sale creation failed:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentRegister, isCashRegisterOpen]);

  const cancelSale = useCallback(async (saleId: string, reason: string, operatorId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('pdv_sales')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: operatorId,
          cancel_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId);

      if (error) throw error;

      // Refresh sales list
      await fetchSales();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cancelar venda';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async (filters?: {
    startDate?: string;
    endDate?: string;
    operatorId?: string;
    cancelled?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pdv_sales')
        .select(`
          *,
          operator:pdv_operators(name),
          items:pdv_sale_items(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.operatorId) {
        query = query.eq('operator_id', filters.operatorId);
      }

      if (filters?.cancelled !== undefined) {
        query = query.eq('is_cancelled', filters.cancelled);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSales(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vendas';
      setError(errorMessage);
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return {
    sales,
    loading,
    error,
    createSale,
    cancelSale,
    refetch: fetchSales
  };
};