import React, { useState, useEffect } from 'react';
import { Order } from '../../types/order';

interface OrderPrintViewProps {
  order: Order;
  storeSettings?: any;
  onClose: () => void;
}

const OrderPrintView: React.FC<OrderPrintViewProps> = ({ order, storeSettings, onClose }) => {
  const [printerSettings, setPrinterSettings] = useState({
    paper_width: '80mm',
    page_size: 300,
    font_size: 2,
    delivery_font_size: 14,
    scale: 1,
    margin_left: 0,
    margin_top: 1,
    margin_bottom: 1
  });
  
  // Carregar configurações de impressora do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('pdv_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.printer_layout) {
          setPrinterSettings(settings.printer_layout);
        }
      } catch (e) {
        console.error('Erro ao carregar configurações de impressora:', e);
      }
    }
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'money': return 'Dinheiro';
      case 'pix': return 'PIX';
      case 'card': return 'Cartão';
      default: return method;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Em Preparo';
      case 'out_for_delivery': return 'Saiu para Entrega';
      case 'ready_for_pickup': return 'Pronto para Retirada';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  // Aplicar configurações de impressora ao estilo
  const printerStyle = `
    @media print {
      /* Esconder ABSOLUTAMENTE todo o conteúdo da página */
      body * {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Mostrar apenas o container de impressão e seus filhos */
      .thermal-receipt-container,
      .thermal-receipt-container * {
        display: block !important;
        visibility: visible !important;
        position: static !important;
        background: white !important;
      }
      
      /* Esconder especificamente elementos problemáticos */
      header, nav, main, footer,
      .bg-gray-50, .max-w-7xl, .px-4, .py-6,
      h1, h2, h3, h4, h5, h6,
      .text-2xl, .font-bold, .text-gray-800 {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Garantir que apenas o recibo seja visível */
      .thermal-receipt-container h1,
      .thermal-receipt-container h2,
      .thermal-receipt-container h3,
      .thermal-receipt-container * {
        display: block !important;
        visibility: visible !important;
      }
      
      @page {
        size: ${printerSettings.paper_width === 'A4' ? 'A4' : '80mm'} auto;
        margin: 0;
        padding: 0;
      }
      
      body {
        margin: 0;
        padding: 0;
        background: white;
        font-family: 'Courier New', monospace;
        font-size: ${Math.max(printerSettings.font_size * 0.8, 1.5)}px;
        line-height: 1.2;
        color: black;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        overflow: visible;
        overflow: visible;
      }
      
      .print\\:hidden {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Remover overlay do modal */
      .thermal-receipt-container {
        background: transparent !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        max-width: none !important;
        max-height: none !important;
        overflow: visible !important;
      }
      
      .thermal-receipt {
        width: ${printerSettings.paper_width === 'A4' ? '190mm' : '75mm'};
        max-width: ${printerSettings.paper_width === 'A4' ? '190mm' : '75mm'};
        margin: 0;
        padding: ${Math.max(printerSettings.margin_top * 0.5, 0.5)}mm ${Math.max(printerSettings.margin_left * 0.5, 0.5)}mm ${Math.max(printerSettings.margin_bottom * 0.5, 0.5)}mm;
        background: white;
        color: black;
        font-family: 'Courier New', monospace;
        font-size: ${Math.max(printerSettings.font_size * 0.8, 1.5)}px;
        line-height: 1.1;
        overflow: visible;
        max-height: none;
        transform: scale(${Math.min(printerSettings.scale * 0.9, 0.9)});
        transform-origin: top left;
        position: static !important;
        display: block !important;
        visibility: visible !important;
        page-break-inside: avoid;
      }
      
      /* Força cores para impressão térmica */
      .thermal-receipt * {
        color: black !important;
        background: white !important;
        border-color: black !important;
      }
      
      .bg-gray-100 {
        background: #f0f0f0 !important;
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
        page-break-inside: avoid;
      }
      
      /* Otimizações para impressão térmica */
      .thermal-receipt h1 {
        font-size: ${Math.max(printerSettings.font_size * 4, 8)}px !important;
        font-weight: bold !important;
        margin: 0 !important;
      }
      
      .thermal-receipt .text-xs {
        font-size: ${Math.max(printerSettings.font_size * 3, 6)}px !important;
      }
      
      .thermal-receipt .text-lg {
        font-size: ${Math.max(printerSettings.font_size * 4, 8)}px !important;
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
      
      .thermal-receipt .mb-3 {
        margin-bottom: 1.5mm !important;
      }
      
      .thermal-receipt .pb-2 {
        padding-bottom: 1mm !important;
      }
      
      .thermal-receipt .pt-2 {
        padding-top: 1mm !important;
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
      
      .thermal-receipt .no-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Compactar espaçamentos */
      .thermal-receipt .space-y-1 > * + * {
        margin-top: 0.5mm !important;
      }
      
      .thermal-receipt .space-y-2 > * + * {
        margin-top: 1mm !important;
      }
      
      .thermal-receipt .space-y-3 > * + * {
        margin-top: 1.5mm !important;
      }
    }
    
    /* Estilos para visualização na tela */
    .thermal-receipt {
      font-family: 'Courier New', monospace;
      max-width: 280px;
      background: white;
      border: 1px solid #ddd;
    }
  `;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 thermal-receipt-container">
      <div className="bg-white rounded-lg max-w-sm w-full max-h-[90vh] overflow-hidden print:rounded-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* Controles de impressão - não aparecem na impressão */}
        <div className="p-4 border-b border-gray-200 print:hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Impressão Térmica
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                title="Imprimir usando as configurações definidas"
              >
                Imprimir
              </button>
              <button
                onClick={onClose}
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
        <div className="thermal-receipt overflow-y-auto max-h-[calc(90vh-120px)] print:overflow-visible print:max-h-none print:block">
          <div className="p-2 print:p-0 no-break">
            {/* Cabeçalho */}
            <div className="text-center mb-2 pb-1 border-b border-dashed border-gray-400 no-break">
              <div className="mb-2">
                <h1 className="text-lg font-bold">ELITE AÇAÍ</h1>
                <p className="text-xs">Delivery Premium</p>
              </div>
              
              <div className="text-xs space-y-0">
                <p>Rua Dois, 2130-A</p>
                <p>Residencial 1 - Cágado</p>
                <p>Tel: (85) 98904-1010</p>
                <p>WhatsApp: (85) 98904-1010</p>
              </div>
            </div>

            {/* Informações do Pedido */}
            <div className="mb-2 text-xs no-break">
              <div className="text-center font-bold mb-2">
                === PEDIDO DE DELIVERY ===
              </div>
              
              <div className="space-y-0">
                <div className="flex justify-between">
                  <span>Pedido:</span>
                  <span>#{order.id.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data:</span>
                  <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hora:</span>
                  <span>{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span>{getStatusLabel(order.status)}</span>
                </div>
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="mb-2 pb-1 border-b border-dashed border-gray-400 no-break">
              <div className="font-bold text-xs mb-1">DADOS DO CLIENTE:</div>
              <div className="text-xs space-y-0">
                <div>
                  <span className="font-medium">Nome:</span>
                  <div>{order.customer_name}</div>
                </div>
                <div>
                  <span className="font-medium">Tel:</span>
                  <div>{order.customer_phone}</div>
                </div>
                <div>
                  <span className="font-medium">End:</span>
                  <div>{order.customer_address}</div>
                  <div>{order.customer_neighborhood}</div>
                  {order.customer_complement && (
                    <div>Comp: {order.customer_complement}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Itens do Pedido */}
            <div className="mb-2 no-break">
              <div className="font-bold text-xs mb-2">ITENS DO PEDIDO:</div>
              
              {order.items.map((item, index) => (
                <div key={index} className="mb-2 pb-1 border-b border-dotted border-gray-300 no-break">
                  <div className="text-xs">
                    <div className="font-medium mb-1">
                      {index + 1}. {item.product_name}
                    </div>
                    
                    {item.selected_size && (
                      <div className="ml-2 text-gray-600">
                        Tamanho: {item.selected_size}
                      </div>
                    )}

                    {/* Complementos */}
                    {item.complements.length > 0 && (
                      <div className="ml-2 mt-0">
                        <div className="font-medium">Complementos:</div>
                        {item.complements.map((comp, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>• {comp.name}</span>
                            <span>{comp.price > 0 ? formatPrice(comp.price) : 'Grátis'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observações */}
                    {item.observations && (
                      <div className="ml-2 mt-0 p-1 bg-gray-100 rounded text-xs">
                        <div className="font-medium">Obs:</div>
                        <div className="italic">"{item.observations}"</div>
                      </div>
                    )}

                    <div className="flex justify-between mt-1 font-medium">
                      <span>{item.quantity}x {formatPrice(item.unit_price)}</span>
                      <span>{formatPrice(item.total_price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo Financeiro */}
            <div className="mb-2 pb-1 border-b border-dashed border-gray-400 no-break">
              <div className="font-bold text-xs mb-2">RESUMO:</div>
              <div className="text-xs space-y-0">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(order.total_price - (order.delivery_fee || 0))}</span>
                </div>
                {order.delivery_fee && order.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa Entrega:</span>
                    <span>{formatPrice(order.delivery_fee)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-0 mt-0">
                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span>{formatPrice(order.total_price)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="mb-2 pb-1 border-b border-dashed border-gray-400 no-break">
              <div className="font-bold text-xs mb-1">PAGAMENTO:</div>
              <div className="text-xs">
                <div>{getPaymentMethodLabel(order.payment_method)}</div>
                {order.payment_method === 'pix' && (
                  <div className="mt-0 p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="font-bold">DADOS PIX:</div>
                    <div>Chave: 85989041010</div>
                    <div>Nome: Grupo Elite</div>
                    <div>Valor: {formatPrice(order.total_price)}</div>
                    <div className="mt-0 font-bold text-red-600">
                      ⚠️ AGUARDANDO COMPROVANTE
                    </div>
                  </div>
                )}
                {order.change_for && (
                  <div>Troco para: {formatPrice(order.change_for)}</div>
                )}
              </div>
            </div>

            {/* Instruções */}
            <div className="mb-2 text-xs no-break">
              <div className="font-bold mb-1">INSTRUÇÕES:</div>
              <div className="space-y-0">
                <div>• Confira todos os itens</div>
                <div>• Tempo estimado: {order.estimated_delivery_minutes || 35}min</div>
                <div>• Dúvidas: (85) 98904-1010</div>
                <div>• Mantenha este comprovante</div>
              </div>
            </div>

            {/* QR Code ou Link de Acompanhamento */}
            <div className="mb-2 text-center text-xs no-break">
              <div className="font-bold mb-1">ACOMPANHE SEU PEDIDO:</div>
              <div className="break-all bg-gray-100 p-1 rounded">
                {window.location.origin}/pedido/{order.id}
              </div>
            </div>

            {/* Rodapé */}
            <div className="text-center text-xs border-t border-dashed border-gray-400 pt-1 no-break">
              <div className="mb-2">
                <div className="font-bold">Obrigado pela preferência!</div>
                <div>Avalie nosso atendimento!</div>
              </div>
              
              <div className="space-y-0">
                <div>@eliteacai</div>
                <div>facebook.com/eliteacai</div>
                <div>⭐⭐⭐⭐⭐ Google & iFood</div>
              </div>

              <div className="mt-1 pt-1 border-t border-gray-300 text-xs">
                <div>Elite Açaí - CNPJ: {storeSettings?.cnpj || '00.000.000/0001-00'}</div>
                <div>Impresso: {new Date().toLocaleString('pt-BR')}</div>
                <div>Este não é um documento fiscal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Estilos específicos para impressão térmica */}
      <style jsx>{printerStyle}</style>

    </div>
  );
};

export default OrderPrintView;