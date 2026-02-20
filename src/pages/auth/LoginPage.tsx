import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Phone, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  phone: z.string().min(11, 'رقم الهاتف يجب أن يكون 11 رقم').max(11),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isAdmin, isPendingCustomer } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.phone, data.password)
      const { user } = useAuthStore.getState()
      if (!user) return

      if (user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else if (user.account_status === 'pending') {
        navigate('/pending', { replace: true })
      } else if (user.account_status === 'active') {
        navigate('/app', { replace: true })
      } else if (user.account_status === 'rejected') {
        toast.error('تم رفض حسابك. تواصل مع المحل للاستفسار.')
      } else {
        toast.error('حسابك موقوف. تواصل مع المحل.')
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ، حاول مرة أخرى')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-3xl font-bold">س</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">سنترال</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">تسجيل الدخول</p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="رقم الهاتف"
              type="tel"
              placeholder="01xxxxxxxxx"
              icon={<Phone size={16} />}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="كلمة المرور"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock size={16} />}
              iconEnd={
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              تسجيل الدخول
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ليس لديك حساب؟{' '}
              <Link to="/register" className="text-blue-600 font-medium hover:underline">
                إنشاء حساب
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
