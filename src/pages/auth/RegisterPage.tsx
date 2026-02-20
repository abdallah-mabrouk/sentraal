import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Phone, Lock, User, Eye, EyeOff, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const schema = z.object({
  full_name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  phone: z.string().min(11, 'رقم الهاتف يجب أن يكون 11 رقم').max(11),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirm_password: z.string(),
  gender: z.string().optional(),
  birth_date: z.string().optional(),
  referral_code: z.string().optional(),
}).refine(data => data.password === data.confirm_password, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const nextStep = async () => {
    const valid = await trigger(['full_name', 'phone', 'password', 'confirm_password'])
    if (valid) setStep(2)
  }

  const onSubmit = async (data: FormData) => {
    try {
      await signUp({
        phone: data.phone,
        password: data.password,
        full_name: data.full_name,
        gender: data.gender,
        birth_date: data.birth_date,
        referral_code: data.referral_code,
      })
      navigate('/pending', { replace: true })
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        toast.error('رقم الهاتف مسجل مسبقاً')
      } else {
        toast.error(err.message || 'حدث خطأ، حاول مرة أخرى')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-3xl font-bold">س</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إنشاء حساب</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 ? 'المعلومات الأساسية' : 'معلومات إضافية (اختياري)'}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-1.5 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-blue-300'}`} />
          <div className={`w-8 h-1.5 rounded-full ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <Input
                  label="الاسم الكامل"
                  placeholder="أحمد محمد"
                  icon={<User size={16} />}
                  error={errors.full_name?.message}
                  required
                  {...register('full_name')}
                />
                <Input
                  label="رقم الهاتف"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  icon={<Phone size={16} />}
                  error={errors.phone?.message}
                  required
                  {...register('phone')}
                />
                <Input
                  label="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="6 أحرف على الأقل"
                  icon={<Lock size={16} />}
                  iconEnd={
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  error={errors.password?.message}
                  required
                  {...register('password')}
                />
                <Input
                  label="تأكيد كلمة المرور"
                  type="password"
                  placeholder="أعد كتابة كلمة المرور"
                  icon={<Lock size={16} />}
                  error={errors.confirm_password?.message}
                  required
                  {...register('confirm_password')}
                />
                <Button type="button" className="w-full" size="lg" onClick={nextStep}>
                  التالي
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <Select
                  label="الجنس"
                  placeholder="اختر الجنس"
                  options={[
                    { value: 'male', label: 'ذكر' },
                    { value: 'female', label: 'أنثى' },
                  ]}
                  {...register('gender')}
                />
                <Input
                  label="تاريخ الميلاد"
                  type="date"
                  {...register('birth_date')}
                />
                <Input
                  label="كود الإحالة (اختياري)"
                  placeholder="XXXXXXXX"
                  icon={<Gift size={16} />}
                  hint="إذا أحالك أحد، أدخل كوده هنا"
                  {...register('referral_code')}
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    رجوع
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    size="lg"
                    loading={isSubmitting}
                  >
                    إنشاء الحساب
                  </Button>
                </div>
              </>
            )}
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              لديك حساب؟{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
