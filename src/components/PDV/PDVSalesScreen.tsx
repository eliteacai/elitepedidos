import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, Calculator, Printer, X, User, Phone } from 'lucide-react';
import { usePDV } from '../../hooks/usePDV';
import { usePDVSales } from '../../hooks/usePDVSales';
import { formatPrice } from '../../utils/formatters';
import { PDVProduct, PDVSaleItem, PDVPaymentType } from '../../types/pdv';
import { ScaleWeightModal } from './ScaleWeightModal';

interface PDVSalesScreenProps {
  onBack: () => void;
}

export default function PDVSalesScreen({ onBack }: PDVSalesScreenProps) {
  const { products, loading: productsLoading } = usePDV();
  const { createSale, loading: saleLoading } = usePDVSales();
  
  const [items, setItems] = useState<PDVSaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentType, setPaymentType] = useState<PDVPaymentType>('dinheiro');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PDVProduct | null>(null);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'acai', label: 'Açaí' },
    { id: 'bebidas', label: 'Bebidas' },
    { id: 'complementos', label: 'Complementos' },
    { id: 'sobremesas', label: 'Sobremesas' },
    { id: 'sorvetes', label: 'Sorvetes' },
    { id: 'outros', label: 'Outros' }
  ];

  const paymentTypes = [
    { id: 'dinheiro' as PDVPaymentType, label: 'Dinheiro' },
    { id: 'pix' as PDVPaymentType, label: 'PIX' },
    { id: 'cartao_credito' as PDVPaymentType, label: 'Cartão Crédito' },
    { id: 'cartao_debito' as PDVPaymentType, label: 'Cartão Débito' },
    { id: 'voucher' as PDVPaymentType, label: 'Voucher' }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.is_active;
  });

  const addItem = (product: PDVProduct, weight?: number) => {
    const existingItemIndex = items.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      if (product.is_weighable && weight) {
        updatedItems[existingItemIndex].weight = (updatedItems[existingItemIndex].weight || 0) + weight;
        updatedItems[existingItemIndex].subtotal = (updatedItems[existingItemIndex].weight || 0) * (product.price_per_gram || 0) * 1000;
      } else {
        updatedItems[existingItemIndex].quantity += 1;
        updatedItems[existingItemIndex].subtotal = updatedItems[existingItemIndex].quantity * (product.unit_price || 0);
      }
      setItems(updatedItems);
    } else {
      const newItem: PDVSaleItem = {
        product,
        quantity: product.is_weighable ? 0 : 1,
        weight: product.is_weighable ? weight || 0 : undefined,
        subtotal: product.is_weighable 
          ? (weight || 0) * (product.price_per_gram || 0) * 1000
          : (product.unit_price || 0),
        discount: 0
      };
      setItems([...items, newItem]);
    }
  };

  const handleProductClick = (product: PDVProduct) => {
    if (product.is_weighable) {
      setSelectedProduct(product);
      setShowWeightModal(true);
    } else {
      addItem(product);
    }
  };

  const handleWeightConfirm = (weight: number) => {
    if (selectedProduct) {
      addItem(selectedProduct, weight);
    }
    setShowWeightModal(false);
    setSelectedProduct(null);
  };

  const updateItemQuantity = (index: number, change: number) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    
    if (item.product.is_weighable) {
      const newWeight = Math.max(0, (item.weight || 0) + (change * 0.1));
      item.weight = newWeight;
      item.subtotal = newWeight * (item.product.price_per_gram || 0) * 1000;
    } else {
      const newQuantity = Math.max(0, item.quantity + change);
      item.quantity = newQuantity;
      item.subtotal = newQuantity * (item.product.unit_price || 0);
    }
    
    if ((item.product.is_weighable && (item.weight || 0) <= 0) || 
        (!item.product.is_weighable && item.quantity <= 0)) {
      updatedItems.splice(index, 1);
    }
    
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getDiscountAmount = () => {
    return (getSubtotal() * discountPercentage) / 100;
  };

  const getTotal = () => {
    return getSubtotal() - getDiscountAmount();
  };

  const getChangeAmount = () => {
    return Math.max(0, receivedAmount - getTotal());
  };

  const handleFinalizeSale = async () => {
    if (items.length === 0) {
      alert('Adicione pelo menos um item à venda');
      return;
    }

    if (paymentType === 'dinheiro' && receivedAmount < getTotal()) {
      alert('Valor recebido é menor que o total da venda');
      return;
    }

    try {
      await createSale({
        items,
        paymentType,
        receivedAmount: paymentType === 'dinheiro' ? receivedAmount : getTotal(),
        discountPercentage,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined
      });

      // Mostrar preview de impressão
      setShowPrintPreview(true);
      
      // Limpar formulário após sucesso
      setItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setReceivedAmount(0);
      setDiscountPercentage(0);
      setPaymentType('dinheiro');
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      alert('Erro ao finalizar venda. Tente novamente.');
    }
  };

  const clearSale = () => {
    setItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setReceivedAmount(0);
    setDiscountPercentage(0);
    setPaymentType('dinheiro');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">PDV - Vendas</h1>
              <p className="text-gray-600">Sistema de Ponto de Venda</p>
            </div>
            <button
              onClick={onBack}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Produtos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Produtos</h2>
              
              {/* Filtros */}
              <div className="mb-4 space-y-4">
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Produtos */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {productsLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Carregando produtos...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="font-medium text-sm text-gray-800 mb-1">
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        Código: {product.code}
                      </div>
                      <div className="text-sm font-semibold text-blue-600">
                        {product.is_weighable 
                          ? `${formatPrice((product.price_per_gram || 0) * 1000)}/kg`
                          : formatPrice(product.unit_price || 0)
                        }
                      </div>
                      {product.is_weighable && (
                        <div className="text-xs text-orange-600 mt-1">
                          Pesável
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Carrinho e Pagamento */}
          <div className="space-y-6">
            {/* Carrinho */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Carrinho</h2>
                {items.length > 0 && (
                  <button
                    onClick={clearSale}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500">Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-800">
                            {item.product.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.product.is_weighable 
                              ? `${((item.weight || 0) * 1000).toFixed(0)}g`
                              : `${item.quantity} un`
                            }
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQuantity(index, -1)}
                            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-medium">
                            {item.product.is_weighable 
                              ? `${((item.weight || 0) * 1000).toFixed(0)}g`
                              : item.quantity
                            }
                          </span>
                          <button
                            onClick={() => updateItemQuantity(index, 1)}
                            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="text-sm font-semibold text-blue-600">
                          {formatPrice(item.subtotal)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dados do Cliente */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Cliente (Opcional)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do cliente"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(85) 99999-9999"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            {items.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pagamento</h3>
                
                <div className="space-y-4">
                  {/* Tipo de Pagamento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Forma de Pagamento
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as PDVPaymentType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {paymentTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Desconto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desconto (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Valor Recebido (apenas para dinheiro) */}
                  {paymentType === 'dinheiro' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor Recebido
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Observações */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Observações sobre a venda..."
                    />
                  </div>

                  {/* Resumo */}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatPrice(getSubtotal())}</span>
                    </div>
                    {discountPercentage > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Desconto ({discountPercentage}%):</span>
                        <span>-{formatPrice(getDiscountAmount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatPrice(getTotal())}</span>
                    </div>
                    {paymentType === 'dinheiro' && receivedAmount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Recebido:</span>
                          <span>{formatPrice(receivedAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span>Troco:</span>
                          <span>{formatPrice(getChangeAmount())}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Botão Finalizar */}
                  <button
                    onClick={handleFinalizeSale}
                    disabled={saleLoading || items.length === 0}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {saleLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Calculator size={16} />
                        Finalizar Venda
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Peso */}
      {showWeightModal && selectedProduct && (
        <ScaleWeightModal
          product={selectedProduct}
          onConfirm={handleWeightConfirm}
          onCancel={() => {
            setShowWeightModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Modal de Impressão */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 thermal-receipt-container">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-hidden print:rounded-none print:max-w-none print:max-h-none print:overflow-visible">
            {/* Controles de impressão - não aparecem na impressão */}
            <div className="p-4 border-b border-gray-200 print:hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  Impressão Térmica - Comprovante
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    title="Imprimir usando as configurações definidas"
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Fechar
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <p>• Configure a impressora para "Térmico Direto"</p>
                <p>• Largura do papel: 80mm (79,5mm ± 0,5mm)</p>
                <p>• Use papel térmico de qualidade</p>
              </div>
            </div>

            {/* Conteúdo para impressão térmica */}
            <div className="thermal-receipt overflow-y-auto max-h-[calc(90vh-120px)] print:overflow-visible print:max-h-none">
              <div className="p-2 print:p-0 no-break">
                {/* Cabeçalho */}
                <div className="text-center mb-2 pb-1 border-b border-dashed border-gray-400 no-break">
                  <div className="mb-1">
                    <h1 className="text-lg font-bold">ELITE AÇAÍ</h1>
                    <p className="text-xs">CNPJ: 00.000.000/0001-00</p>
                  </div>
                  
                  <div className="text-xs space-y-0">
                    <p>Rua Dois, 2130-A</p>
                    <p>Residencial 1 - Cágado</p>
                    <p>Tel: (85) 98904-1010</p>
                    <p>--------------------------</p>
                    <p>CUPOM NÃO FISCAL</p>
                    <p>--------------------------</p>
                  </div>
                </div>
                
                {/* Informações da Venda */}
                <div className="mb-2 text-xs no-break">
                  <div className="space-y-0">
                    <div className="flex justify-between">
                      <span>Data:</span>
                      <span>{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hora:</span>
                      <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {customerName && (
                      <div>
                        <span>Cliente:</span>
                        <div>{customerName}</div>
                      </div>
                    )}
                    {customerPhone && (
                      <div>
                        <span>Telefone:</span>
                        <div>{customerPhone}</div>
                      </div>
                    )}
                    <p>--------------------------</p>
                  </div>
                </div>
                
                {/* Itens */}
                <div className="mb-2 no-break">
                  <p className="font-bold text-xs mb-1">ITENS</p>
                  {items.map((item, index) => (
                    <div key={index} className="mb-1 text-xs">
                      <div className="font-medium">{item.product.name}</div>
                      {item.product.is_weighable ? (
                        <div className="flex justify-between">
                          <span>{(item.weight || 0) * 1000}g x {formatPrice((item.product.price_per_gram || 0) * 1000)}/kg</span>
                          <span>{formatPrice(item.subtotal)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span>{item.quantity} x {formatPrice(item.product.unit_price || 0)}</span>
                          <span>{formatPrice(item.subtotal)}</span>
                        </div>
                      )}
                      {item.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Desconto:</span>
                          <span>-{formatPrice(item.discount)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <p>--------------------------</p>
                </div>
                
                {/* Totais */}
                <div className="mb-2 text-xs no-break">
                  <div className="space-y-0">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(getSubtotal())}</span>
                    </div>
                    {getDiscountAmount() > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Desconto:</span>
                        <span>-{formatPrice(getDiscountAmount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-300">
                      <span>TOTAL:</span>
                      <span>{formatPrice(getTotal())}</span>
                    </div>
                    <p>--------------------------</p>
                  </div>
                </div>
                
                {/* Pagamento */}
                <div className="mb-2 text-xs no-break">
                  <div className="font-bold mb-1">PAGAMENTO:</div>
                  <div>{paymentTypes.find(t => t.id === paymentType)?.label || paymentType}</div>
                  {paymentType === 'dinheiro' && receivedAmount > 0 && (
                    <div className="space-y-0">
                      <div className="flex justify-between">
                        <span>Valor Recebido:</span>
                        <span>{formatPrice(receivedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Troco:</span>
                        <span>{formatPrice(getChangeAmount())}</span>
                      </div>
                    </div>
                  )}
                  {paymentType === 'pix' && (
                    <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="font-bold">DADOS PIX:</div>
                      <div>Chave: 85989041010</div>
                      <div>Nome: Grupo Elite</div>
                      <div>Valor: {formatPrice(getTotal())}</div>
                    </div>
                  )}
                  <p>--------------------------</p>
                </div>
                
                {/* Rodapé */}
                <div className="text-center text-xs no-break">
                  <div className="mb-1">
                    <div className="font-bold">Obrigado pela preferência!</div>
                    <div>Volte sempre!</div>
                  </div>
                  
                  <div className="space-y-0">
                    <div>@eliteacai</div>
                    <div>⭐⭐⭐⭐⭐ Avalie-nos!</div>
                  </div>

                  <div className="mt-1 pt-1 border-t border-gray-300 text-xs">
                    <div>Elite Açaí - CNPJ: 00.000.000/0001-00</div>
                    <div>Impresso: {new Date().toLocaleString('pt-BR')}</div>
                    <div>Este não é um documento fiscal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Estilos específicos para impressão térmica */}
          <style jsx>{`
            @media print {
              /* Esconder elementos da página principal */
              body > div:not(.thermal-receipt-container),
              header, nav, main, footer,
              .bg-gray-50, .max-w-7xl, .px-4, .py-6 {
                display: none !important;
              }
              
              /* Esconder títulos da página principal */
              body > * h1:not(.thermal-receipt-container h1),
              body > * h2:not(.thermal-receipt-container h2) {
                display: none !important;
              }
              
              @page {
                size: 80mm auto;
                margin: 0;
                padding: 0;
              }
              
              body {
                margin: 0;
                padding: 0;
                background: white;
                font-family: 'Courier New', monospace;
                font-size: 1.6px;
                line-height: 1.1;
                color: black;
                overflow: visible;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .print\\:hidden {
                display: none !important;
              }
              
              /* Container de impressão */
              .thermal-receipt-container {
                position: static !important;
                background: white !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                max-width: none !important;
                max-height: none !important;
                overflow: visible !important;
              }
              
              .thermal-receipt {
                width: 75mm;
                max-width: 75mm;
                margin: 0;
                padding: 0.5mm;
                background: white;
                color: black;
                font-family: 'Courier New', monospace;
                font-size: 1.6px;
                line-height: 1.1;
                overflow: visible;
                max-height: none;
                transform: scale(0.9);
                transform-origin: top left;
                page-break-inside: avoid;
                position: static !important;
                display: block !important;
              }
              
              .fixed {
                position: static !important;
              }
              
              .bg-black\\/50 {
                background: transparent !important;
              }
              
              .rounded-2xl {
                border-radius: 0 !important;
              }
              
              .max-w-sm {
                max-width: none !important;
              }
              
              .w-full {
                width: 75mm !important;
              }
              
              .max-h-\\[90vh\\] {
                max-height: none !important;
              }
              
              .overflow-hidden {
                overflow: visible !important;
              }
              
              /* Força cores para impressão térmica */
              * {
                color: black !important;
                background: white !important;
                border-color: black !important;
              }
              
              .bg-gray-100 {
                background: #f0f0f0 !important;
              }
              
              .bg-blue-50 {
                background: #f0f8ff !important;
              }
              
              .border-dashed {
                border-style: dashed !important;
              }
              
              .border-dotted {
                border-style: dotted !important;
              }
              
              /* Quebras de página */
              .page-break {
                page-break-before: always;
              }
              
              .no-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              
              /* Otimizações para impressão térmica */
              .thermal-receipt h1 {
                font-size: 6px !important;
                font-weight: bold !important;
                margin: 0 !important;
              }
              
              .thermal-receipt .text-xs {
                font-size: 4.8px !important;
              }
              
              .thermal-receipt .text-lg {
                font-size: 6.4px !important;
              }
              
              .thermal-receipt .font-bold {
                font-weight: bold !important;
              }
              
              .thermal-receipt .font-medium {
                font-weight: 600 !important;
              }
              
              /* Espaçamento otimizado */
              .thermal-receipt .mb-1 {
                margin-bottom: 0.5mm !important;
              }
              
              .thermal-receipt .mb-2 {
                margin-bottom: 1mm !important;
              }
              
              .thermal-receipt .pb-1 {
                padding-bottom: 0.5mm !important;
              }
              
              .thermal-receipt .pt-1 {
                padding-top: 0.5mm !important;
              }
              
              .thermal-receipt .p-1 {
                padding: 0.5mm !important;
              }
              
              .thermal-receipt .p-2 {
                padding: 1mm !important;
              }
              
              /* Bordas para impressão térmica */
              .thermal-receipt .border-b {
                border-bottom: 1px solid black !important;
              }
              
              .thermal-receipt .border-t {
                border-top: 1px solid black !important;
              }
              
              .thermal-receipt .border-dashed {
                border-style: dashed !important;
              }
              
              .thermal-receipt .border-dotted {
                border-style: dotted !important;
              }
              
              /* Flexbox para alinhamento */
              .thermal-receipt .flex {
                display: flex !important;
              }
              
              .thermal-receipt .justify-between {
                justify-content: space-between !important;
              }
              
              .thermal-receipt .text-center {
                text-align: center !important;
              }
              
              .thermal-receipt .break-all {
                word-break: break-all !important;
              }
              
              /* Evitar quebras de página */
              .thermal-receipt * {
                page-break-inside: avoid !important;
              }
              
              /* Compactar espaçamentos */
              .thermal-receipt .space-y-0 > * + * {
                margin-top: 0 !important;
              }
              
              .thermal-receipt .space-y-1 > * + * {
                margin-top: 0.5mm !important;
              }
            }
            
            /* Estilos para visualização na tela */
            .thermal-receipt {
              font-family: 'Courier New', monospace;
              max-width: 280px;
              background: white;
              border: 1px solid #ddd;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}