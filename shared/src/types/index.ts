// ─── Enums ────────────────────────────────────────────────────────────────────

export enum OrderStatus {
  CRIADO = "CRIADO",
  AGUARDANDO_PAGAMENTO = "AGUARDANDO_PAGAMENTO",
  PAGAMENTO_APROVADO = "PAGAMENTO_APROVADO",
  EM_SEPARACAO = "EM_SEPARACAO",
  PRONTO_PARA_RETIRADA = "PRONTO_PARA_RETIRADA",
  SAIU_PARA_ENTREGA = "SAIU_PARA_ENTREGA",
  ENVIADO_CORREIOS = "ENVIADO_CORREIOS",
  ENTREGUE = "ENTREGUE",
  CANCELADO = "CANCELADO",
}

export enum PaymentStatus {
  AGUARDANDO = "AGUARDANDO",
  PAGO = "PAGO",
  RECUSADO = "RECUSADO",
  CANCELADO = "CANCELADO",
  REEMBOLSADO = "REEMBOLSADO",
}

export enum PaymentMethod {
  PIX = "PIX",
  CARTAO_CREDITO = "CARTAO_CREDITO",
  BOLETO = "BOLETO",
}

export enum ShippingType {
  CORREIOS = "CORREIOS",
  MOTOTAXI = "MOTOTAXI",
  RETIRADA = "RETIRADA",
}

export enum NotificationType {
  PEDIDO_CONFIRMADO = "PEDIDO_CONFIRMADO",
  PAGAMENTO_APROVADO = "PAGAMENTO_APROVADO",
  EM_SEPARACAO = "EM_SEPARACAO",
  PRONTO_RETIRADA = "PRONTO_RETIRADA",
  SAIU_ENTREGA = "SAIU_ENTREGA",
  ENTREGUE = "ENTREGUE",
  PROMOCAO = "PROMOCAO",
}

// ─── Product Types ─────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
}

export interface ProductVariation {
  id: string;
  name: string;
  value: string;
  stock: number;
  priceModifier: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  promotionalPrice?: number;
  stock: number;
  minStock: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  active: boolean;
  featured: boolean;
  isNew: boolean;
  category: Category;
  categoryId: string;
  images: ProductImage[];
  variations: ProductVariation[];
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Cart Types ────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  product: Product;
  productId: string;
  variationId?: string;
  variation?: ProductVariation;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  itemCount: number;
}

// ─── Address Types ─────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  label?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

// ─── Shipping Types ────────────────────────────────────────────────────────────

export interface ShippingOption {
  type: ShippingType;
  name: string;
  description: string;
  price: number;
  estimatedDays?: number;
  available: boolean;
}

export interface ShippingCalculateRequest {
  zipCode: string;
  items: Array<{
    productId: string;
    quantity: number;
    weight: number;
    height: number;
    width: number;
    length: number;
  }>;
}

// ─── Order Types ───────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  product: Product;
  productId: string;
  productName: string;
  productImage?: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  gatewayId?: string;
  pixCode?: string;
  pixExpiration?: string;
  paidAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customer: Customer;
  customerId: string;
  items: OrderItem[];
  address?: Address;
  shippingType: ShippingType;
  shippingPrice: number;
  shippingTrackingCode?: string;
  subtotal: number;
  total: number;
  payment?: Payment;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Customer/User Types ───────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  addresses: Address[];
  orders?: Order[];
  createdAt: string;
}

// ─── Admin Types ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  todayRevenue: number;
  monthRevenue: number;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  storeAddress: string;
  storeCity: string;
  storeState: string;
  storeZipCode: string;
  storePhone: string;
  storeWhatsapp?: string;
  storeEmail: string;
  storeHours?: string;
  mototaxiPrice: number;
  mototaxiEnabled: boolean;
  correiosEnabled: boolean;
  storePickupEnabled: boolean;
  logoUrl?: string;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
