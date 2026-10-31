import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, Store, Printer, CreditCard, Award, ShieldAlert, Check } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { settingsService } from '@/services/api/settingsService'
import { useToast } from '@/components/ui/Toast'
import type { StoreSettings, PaymentMethod } from '@/types'

const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Card',
  'EVC Plus',
  'eDahab',
  'ZAAD',
  'Bank Transfer',
]

export const StoreSettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: () => settingsService.getSettings(),
  })

  // Form State
  const [storeName, setStoreName] = React.useState('')
  const [tagline, setTagline] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [city, setCity] = React.useState('')
  const [taxNumber, setTaxNumber] = React.useState('')
  const [currency, setCurrency] = React.useState<'USD' | 'SOS'>('USD')
  const [timezone, setTimezone] = React.useState('Africa/Mogadishu (UTC+3)')
  const [defaultTaxRate, setDefaultTaxRate] = React.useState('5')
  const [taxInclusive, setTaxInclusive] = React.useState(true)
  const [thermalPrinterType, setThermalPrinterType] = React.useState<'58mm' | '80mm'>('80mm')
  const [receiptHeader, setReceiptHeader] = React.useState('')
  const [receiptFooter, setReceiptFooter] = React.useState('')
  const [lowStockDefault, setLowStockDefault] = React.useState('10')
  const [expiryAlertDays, setExpiryAlertDays] = React.useState('30')
  const [loyaltyRate, setLoyaltyRate] = React.useState('1')
  const [enabledMethods, setEnabledMethods] = React.useState<PaymentMethod[]>([])

  // Populate form when data loads
  React.useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName || '')
      setTagline(settings.tagline || '')
      setPhone(settings.phone || '')
      setEmail(settings.email || '')
      setAddress(settings.address || '')
      setCity(settings.city || '')
      setTaxNumber(settings.taxNumber || '')
      setCurrency(settings.currency || 'USD')
      setTimezone(settings.timezone || 'Africa/Mogadishu (UTC+3)')
      setDefaultTaxRate((settings.defaultTaxRate ?? 5).toString())
      setTaxInclusive(settings.taxInclusive ?? true)
      setThermalPrinterType(settings.thermalPrinterType || '80mm')
      setReceiptHeader(settings.receiptHeader || '')
      setReceiptFooter(settings.receiptFooter || '')
      setLowStockDefault((settings.lowStockThresholdDefault ?? 10).toString())
      setExpiryAlertDays((settings.expiryAlertDaysDefault ?? 30).toString())
      setLoyaltyRate((settings.loyaltyPointsPerDollar ?? 1).toString())
      setEnabledMethods(settings.enabledPaymentMethods || [])
    }
  }, [settings])

  const handleTogglePaymentMethod = (method: PaymentMethod) => {
    if (enabledMethods.includes(method)) {
      setEnabledMethods(enabledMethods.filter((m) => m !== method))
    } else {
      setEnabledMethods([...enabledMethods, method])
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await settingsService.updateSettings({
        storeName,
        tagline,
        phone,
        email,
        address,
        city,
        taxNumber,
        currency,
        timezone,
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
        taxInclusive,
        thermalPrinterType,
        receiptHeader,
        receiptFooter,
        lowStockThresholdDefault: parseInt(lowStockDefault, 10) || 5,
        expiryAlertDaysDefault: parseInt(expiryAlertDays, 10) || 30,
        loyaltyPointsPerDollar: parseFloat(loyaltyRate) || 1,
        enabledPaymentMethods: enabledMethods,
      })
      success('Settings Updated', 'Supermarket operational parameters saved successfully')
      queryClient.invalidateQueries({ queryKey: ['store-settings'] })
    } catch (err: any) {
      error('Update Failed', err.message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Configuration & Settings"
        description="Unified configuration for this physical supermarket location. Multi-branch settings are strictly disabled."
      />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Store Profile & Legal Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[#16A34A]" />
              <CardTitle>Supermarket Identity & Contact Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Supermarket Legal Name"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
              <Input
                label="Brand Slogan / Tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
              <Input
                label="Store Contact Phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Store Official Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Street Address / District"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Input
                label="City & Country"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="Tax Identification / VAT Registration"
                required
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
              />
              <Select
                label="Store Operating Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Africa/Mogadishu (UTC+3)">Africa/Mogadishu (UTC+3)</option>
                <option value="Africa/Nairobi (UTC+3)">Africa/Nairobi (UTC+3)</option>
                <option value="Asia/Dubai (UTC+4)">Asia/Dubai (UTC+4)</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Currency & Tax Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <CardTitle>Currency & Tax Rules</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Primary Operating Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
              >
                <option value="USD">United States Dollar (USD $)</option>
                <option value="SOS">Somali Shilling (SOS Sh)</option>
              </Select>

              <Input
                label="Default Sales Tax / VAT Rate (%)"
                type="number"
                step="0.1"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
              />

              <div className="pt-6">
                <Switch
                  checked={taxInclusive}
                  onChange={setTaxInclusive}
                  label="Tax-Inclusive Shelf Pricing"
                  description="Whether shelf price already incorporates sales tax."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Thermal Receipt & Printing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-[#16A34A]" />
              <CardTitle>Thermal Receipt & Printer Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Thermal Printer Paper Width Default"
                  value={thermalPrinterType}
                  onChange={(e) => setThermalPrinterType(e.target.value as any)}
                >
                  <option value="80mm">Standard 80 mm Thermal Roll (Wide)</option>
                  <option value="58mm">Compact 58 mm Thermal Roll</option>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#334155] dark:text-[#9CA3AF] mb-1">
                  Receipt Header Message
                </label>
                <textarea
                  rows={2}
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#374151] font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#334155] dark:text-[#9CA3AF] mb-1">
                  Receipt Footer Policy Message
                </label>
                <textarea
                  rows={2}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#374151] font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Enabled Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Enabled Payment Methods at POS Checkout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_PAYMENT_METHODS.map((method) => {
                const isEnabled = enabledMethods.includes(method)
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleTogglePaymentMethod(method)}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                      isEnabled
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-bold'
                        : 'border-[#E2E8F0] dark:border-[#374151] text-[#64748B]'
                    }`}
                  >
                    <span>{method}</span>
                    <span
                      className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                        isEnabled ? 'bg-[#16A34A] text-white' : 'border border-[#CBD5E1]'
                      }`}
                    >
                      {isEnabled && '✓'}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Inventory & Loyalty Program Defaults */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <CardTitle>Inventory Thresholds & Loyalty Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Default Low Stock Alert Threshold"
                type="number"
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(e.target.value)}
                helperText="Triggers dashboard alert when quantity drops below"
              />

              <Input
                label="Expiry Warning Window (Days)"
                type="number"
                value={expiryAlertDays}
                onChange={(e) => setExpiryAlertDays(e.target.value)}
                helperText="Flags batch as near-expiry (FEFO)"
              />

              <Input
                label="Loyalty Points Earned Per $1 Spent"
                type="number"
                step="0.1"
                value={loyaltyRate}
                onChange={(e) => setLoyaltyRate(e.target.value)}
                helperText="E.g. 1 point per $1 spent"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="lg" className="px-8 font-bold shadow-md">
            <Save className="h-4 w-4 mr-2" />
            Save Store Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
